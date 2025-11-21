"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Copy, FileText, Trash2 } from "lucide-react";
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
        setLastFailedMessage(null); // Clear any previous failed message

        // Clear selected text after first message so subsequent messages use full doc context
        if (selectedText && onClearSelection) {
            onClearSelection();
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: messageText,
                    // Use selectedText as context if available, otherwise use full document
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
                    // If can't parse error JSON, use status text
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response body available");
            }

            const decoder = new TextDecoder();
            let assistantMessage = "";
            const assistantId = (Date.now() + 1).toString();

            // Add placeholder message
            setMessages((prev) => [
                ...prev,
                {
                    id: assistantId,
                    role: "assistant",
                    content: "",
                    timestamp: Date.now(),
                },
            ]);

            let buffer = ""; // Buffer for incomplete lines

            while (true) {
                try {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    // Process complete lines
                    const lines = buffer.split("\n");
                    // Keep the last incomplete line in buffer
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        if (line.startsWith("data: ")) {
                            const data = line.slice(6).trim();

                            if (data === "[DONE]") {
                                break;
                            }

                            try {
                                const parsed = JSON.parse(data);

                                if (parsed.error) {
                                    throw new Error(parsed.error);
                                }

                                if (parsed.chunk) {
                                    assistantMessage += parsed.chunk;
                                    // Update the message in real-time
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === assistantId
                                                ? { ...msg, content: assistantMessage }
                                                : msg
                                        )
                                    );
                                }
                            } catch (parseError: any) {
                                // Only log parse errors, don't break the stream
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

            // If no content was received, show error
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

            // Save the failed message for retry
            setLastFailedMessage(messageText);

            toast.error(errorMessage);

            // Mark the assistant message as error instead of removing it
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
            // Remove the error message before retrying
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

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-2xl flex flex-col z-50 overscroll-contain">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm">AI Assistant</h2>
                        <p className="text-xs text-muted-foreground">Ask anything about your document</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 mb-4">
                            <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Start a conversation with AI
                        </p>
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
                            {SUGGESTED_PROMPTS.map((prompt, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestedPrompt(prompt)}
                                    className="block w-full text-left text-xs p-2 rounded border hover:bg-accent transition-colors"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"
                            }`}
                    >
                        {message.isError ? (
                            // Error message with retry button
                            <div className="max-w-[85%] space-y-2">
                                <div className="rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                    <div className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className={`max-w-[85%] rounded-lg p-3 ${message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                    }`}
                            >
                                {message.role === "assistant" ? (
                                    message.content ? (
                                        <MarkdownRenderer content={message.content} />
                                    ) : (
                                        <Skeleton className="h-4 w-32" />
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
                                    className="h-6 w-6"
                                    onClick={() => handleCopyMessage(message.content)}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                                {onInsert && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleInsertMessage(message.content)}
                                    >
                                        <FileText className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex gap-3 mb-4 items-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                            <Sparkles className="h-4 w-4 text-white animate-spin" />
                        </div>
                        <div className="flex-1 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    AI is thinking
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

            {/* Input */}
            <div className="p-4 border-t">
                {messages.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearHistory}
                        className="w-full mb-2 text-xs"
                    >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Clear History
                    </Button>
                )}
                {/* Selected text preview (ChatGPT style) */}
                {selectedText && (
                    <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                        <svg className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            className="h-5 w-5 -mt-0.5"
                            onClick={() => onClearSelection?.()}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question..."
                        className="min-h-[44px] max-h-32 resize-none"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className="h-[44px] w-[44px] rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L12 22M12 2L6 8M12 2L18 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
};
