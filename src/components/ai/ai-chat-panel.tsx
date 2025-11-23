"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Copy, FileText, Trash2, Bot, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    isError?: boolean;
    errorMessage?: string;
}

interface AIChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    documentContent?: string;
    documentTitle?: string;
    onInsert?: (text: string) => void;
    selectedText?: string;
    onClearSelection?: () => void;
}

const SUGGESTED_PROMPTS = [
    "Summarize this document",
    "What are the key points?",
    "Suggest improvements",
    "Generate an outline",
    "Continue writing",
];

export const AIChatPanel = ({
    isOpen,
    onClose,
    documentContent,
    documentTitle,
    onInsert,
    selectedText,
    onClearSelection,
}: AIChatPanelProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isContinuing, setIsContinuing] = useState(false);
    const [continuationInfo, setContinuationInfo] = useState<{ count: number; chars: number } | null>(null);
    const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isOpen]);

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: messageText.trim(),
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setLastFailedMessage(null);

        if (selectedText && onClearSelection) {
            onClearSelection();
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: messageText,
                    documentContent: selectedText || documentContent,
                    documentTitle,
                    history: messages.map((msg) => ({
                        role: msg.role,
                        content: msg.content,
                    })),
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = "Failed to get response";
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response body available");
            }

            const decoder = new TextDecoder();
            let assistantMessage = "";
            const assistantId = (Date.now() + 1).toString();

            setMessages((prev) => [
                ...prev,
                {
                    id: assistantId,
                    role: "assistant",
                    content: "",
                    timestamp: Date.now(),
                },
            ]);

            let buffer = "";

            while (true) {
                try {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        if (line.startsWith("data: ")) {
                            const data = line.slice(6).trim();

                            if (data === "[DONE]") {
                                setIsContinuing(false);
                                setContinuationInfo(null);
                                break;
                            }

                            try {
                                const parsed = JSON.parse(data);

                                if (parsed.error) {
                                    throw new Error(parsed.error);
                                }

                                // Handle chunk data (new format)
                                if (parsed.chunk) {
                                    assistantMessage += parsed.chunk;
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === assistantId
                                                ? { ...msg, content: assistantMessage }
                                                : msg
                                        )
                                    );
                                }

                                // Handle status updates (continuation, done, etc.)
                                if (parsed.status) {
                                    if (parsed.status === 'continuing') {
                                        setIsContinuing(true);
                                        setContinuationInfo({
                                            count: parsed.continuationCount || 0,
                                            chars: parsed.chars || 0,
                                        });
                                        // Log token info if available
                                        if (parsed.tokens) {
                                            console.log(`[AI] Continuation ${parsed.continuationCount}: ${parsed.tokens} tokens`);
                                        }
                                    } else if (parsed.status === 'done') {
                                        setIsContinuing(false);
                                        setContinuationInfo(null);
                                        // Log final stats
                                        if (parsed.tokens) {
                                            console.log(`[AI] Completed: ${parsed.tokens} tokens total, ${parsed.continuations || 0} continuations`);
                                        }
                                    } else if (parsed.status === 'max_continuations_reached') {
                                        console.warn('Max continuations reached:', parsed.message);
                                        toast.warning(parsed.message || 'Response reached maximum length limit');
                                    }
                                }
                            } catch (parseError: any) {
                                console.warn("Failed to parse SSE data:", data, parseError.message);
                            }
                        }
                    }
                } catch (readError: any) {
                    console.error("Stream read error:", readError);
                    if (readError.name === 'AbortError') {
                        throw new Error("Request timeout - please try again");
                    }
                    break;
                }
            }

            if (!assistantMessage.trim()) {
                throw new Error("No response received from AI");
            }

        } catch (error: any) {
            console.error("Chat error:", error);

            let errorMessage = "Failed to get AI response";

            if (error.name === 'AbortError') {
                errorMessage = "Request timeout - please try again with a shorter message";
            } else if (error.message) {
                errorMessage = error.message;
            }

            setLastFailedMessage(messageText);

            toast.error(errorMessage);

            setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.role === "assistant" && !lastMessage?.content) {
                    return prev.slice(0, -1).concat({
                        ...lastMessage,
                        isError: true,
                        errorMessage,
                    });
                }
                return prev;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        if (lastFailedMessage) {
            setMessages((prev) => prev.filter(msg => !msg.isError));
            sendMessage(lastFailedMessage);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const handleSuggestedPrompt = (prompt: string) => {
        setInput(prompt);
        textareaRef.current?.focus();
    };

    const handleCopyMessage = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success("Message copied to clipboard");
        } catch (error) {
            toast.error("Failed to copy message");
        }
    };

    const handleInsertMessage = (content: string) => {
        if (onInsert) {
            onInsert(content);
            toast.success("Inserted into document");
        }
    };

    const handleClearHistory = () => {
        setMessages([]);
        toast.success("Chat history cleared");
    };

    const handleDownloadChat = () => {
        if (messages.length === 0) {
            toast.error("No chat history to download");
            return;
        }

        try {
            // Format chat as markdown
            let markdown = `# AI Chat History\n\n`;
            markdown += `**Document**: ${documentTitle || "Untitled"}\n`;
            markdown += `**Date**: ${new Date().toLocaleString()}\n\n`;
            markdown += `---\n\n`;

            messages.forEach((msg) => {
                const role = msg.role === "user" ? "👤 You" : "🤖 AI Assistant";
                const timestamp = new Date(msg.timestamp).toLocaleTimeString();
                markdown += `### ${role} (${timestamp})\n\n`;
                markdown += `${msg.content}\n\n`;
            });

            // Create and download file
            const blob = new Blob([markdown], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const filename = `chat-${documentTitle?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'history'}-${Date.now()}.md`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Chat history downloaded!");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download chat history");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-background/95 backdrop-blur-xl border-l border-purple-500/20 shadow-2xl flex flex-col z-50 overscroll-contain">
            {/* Header */}
            <div className="relative p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 backdrop-blur-sm">
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 animate-pulse"></div>

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* AI Avatar with gradient border animation */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-sm opacity-75 animate-pulse"></div>
                            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                AI Assistant
                            </h2>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <p className="text-xs text-muted-foreground">Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDownloadChat}
                                    className="h-8 w-8 hover:bg-purple-500/20 transition-colors"
                                    title="Download chat"
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleClearHistory}
                                    className="h-8 w-8 hover:bg-purple-500/20 transition-colors"
                                    title="Clear history"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 hover:bg-purple-500/20 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                {messages.length === 0 && (
                    <div className="text-center py-12 space-y-6 animate-[fadeIn_0.5s_ease]">
                        {/* Animated AI Avatar */}
                        <div className="inline-flex relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative p-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30">
                                <Sparkles className="h-10 w-10 text-purple-600 dark:text-purple-400 animate-pulse" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Start a conversation
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Ask me anything about your document
                            </p>
                        </div>

                        <div className="space-y-2 px-4">
                            <p className="text-xs font-medium text-muted-foreground">Suggested prompts:</p>
                            {SUGGESTED_PROMPTS.map((prompt, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestedPrompt(prompt)}
                                    className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-200 hover:scale-[1.02]"
                                    style={{
                                        animation: `slideInFromBottom 0.5s ease ${index * 0.1}s backwards`
                                    }}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message, index) => (
                    <div
                        key={message.id}
                        className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}
                        style={{
                            animation: `slideInFromBottom 0.3s ease ${index * 0.05}s backwards`
                        }}
                    >
                        {message.isError ? (
                            <div className="max-w-[85%] space-y-2">
                                <div className="rounded-xl p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                    <div className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{message.errorMessage || "Failed to get response"}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRetry}
                                    disabled={isLoading}
                                    className="h-8 text-xs bg-background hover:bg-accent"
                                >
                                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Retry
                                </Button>
                            </div>
                        ) : (
                            <div
                                className={`max-w-[85%] rounded-2xl p-3.5 transition-all duration-200 ${message.role === "user"
                                    ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40"
                                    : "bg-muted/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
                                    }`}
                            >
                                {message.role === "assistant" ? (
                                    message.content ? (
                                        <MarkdownRenderer content={message.content} />
                                    ) : (
                                        <div className="space-y-2">
                                            <Skeleton className="h-3 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    )
                                ) : (
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                        {message.content || <Skeleton className="h-4 w-32" />}
                                    </p>
                                )}
                            </div>
                        )}
                        {message.role === "assistant" && message.content && !message.isError && (
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-purple-500/10 transition-colors"
                                    onClick={() => handleCopyMessage(message.content)}
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                                {onInsert && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 hover:bg-purple-500/10 transition-colors"
                                        onClick={() => handleInsertMessage(message.content)}
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex gap-3 items-start" style={{ animation: 'slideInFromBottom 0.3s ease' }}>
                        <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                            <Sparkles className="h-4 w-4 text-white animate-pulse" />
                        </div>
                        <div className="flex-1 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800/50">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    {isContinuing
                                        ? `Generating more content... (Part ${continuationInfo?.count || 1})`
                                        : 'AI is thinking'
                                    }
                                </span>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0s", animationDuration: "0.6s" }}></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0.15s", animationDuration: "0.6s" }}></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0.3s", animationDuration: "0.6s" }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5 backdrop-blur-sm space-y-3">
                {/* Selected text preview */}
                {selectedText && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm">
                        <svg className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {selectedText}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 -mt-0.5 hover:bg-purple-500/20"
                            onClick={() => onClearSelection?.()}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                {/* Input form with integrated design */}
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                        {/* Unified gradient glow background */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-20 blur-sm"></div>

                        {/* Main input container - only textarea and send button */}
                        <div className="relative bg-background border border-purple-500/30 rounded-2xl p-2 flex items-center gap-2 focus-within:border-purple-500/50 transition-all">
                            {/* Textarea */}
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question..."
                                className="flex-1 min-h-[40px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2"
                                disabled={isLoading}
                            />

                            {/* Send button (vertically centered) */}
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isLoading}
                                className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 shadow-lg shadow-purple-500/30 transition-all hover:shadow-purple-500/50"
                            >
                                {isLoading ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <Send className="h-4 w-4 text-white" />
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
