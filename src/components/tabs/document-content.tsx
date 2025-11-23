"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useCallback, memo, useState } from "react";
import { notFound } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Toolbar } from "@/app/[locale]/(main)/documents/[documentId]/toolbar";
import { Cover } from "@/app/[locale]/(main)/documents/[documentId]/cover";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "@/components/editor";
import { useTabs } from "@/contexts/tabs-context";
import { AIChatPanel } from "@/components/ai/ai-chat-panel";
import { FloatingAIButton } from "@/components/ai/floating-ai-button";
import { SelectionAIButton } from "@/components/ai/selection-ai-button";

interface DocumentContentProps {
    documentId: Id<"documents">;
    isActive?: boolean;
}

function DocumentContentComponent({ documentId, isActive }: DocumentContentProps) {
    const { updateTab } = useTabs();
    const prevDocumentRef = useRef<{ title: string; icon?: string } | null>(null);

    const document = useQuery(api.documents.getById, {
        documentId: documentId,
    });

    // Load blocks for this document
    console.log('===> debug next', documentId)
    const blocks = useQuery(api.blocks.getDocumentBlocks, {
        documentId: documentId,
    });
    console.log("blocks", blocks);

    const update = useMutation(api.documents.update);
    const [showAIChat, setShowAIChat] = useState(false);
    const [selectedText, setSelectedText] = useState<string>("");
    const [aiContextText, setAiContextText] = useState<string>(""); // Text to pass to AI chat

    // Reconstruct content from blocks
    const isBlocksLoading = blocks === undefined;
    const hasBlocks = blocks && blocks.length > 0;

    const contentFromBlocks = hasBlocks
        ? JSON.stringify(blocks.map(b => ({
            type: b.type,
            content: b.content,
            props: b.props,
        })), null, 2)
        : undefined;

    // Update tab when document data changes (but avoid redundant updates)
    useEffect(() => {
        if (document) {
            const current = { title: document.title, icon: document.icon };
            const prev = prevDocumentRef.current;

            // Only update if values actually changed
            if (!prev || prev.title !== current.title || prev.icon !== current.icon) {
                updateTab(documentId, current);
                prevDocumentRef.current = current;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [document?.title, document?.icon, documentId]);

    // Update window title when active
    useEffect(() => {
        if (isActive && document?.title) {
            window.document.title = `${document.title} - Nova`;
        }
    }, [isActive, document?.title]);

    // Detect text selection
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            if (text && text.length > 0) {
                setSelectedText(text);
            } else {
                setSelectedText(""); // Clear selection if nothing is selected
            }
        };

        window.document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            window.document.removeEventListener("selectionchange", handleSelectionChange);
        };
    }, []);

    // Handler to open AI chat with selected text
    const handleOpenAIChat = useCallback(() => {
        setAiContextText(selectedText); // Save current selection for AI
        setShowAIChat(true);

        // Clear selection to hide the Ask AI button
        setSelectedText("");
        window.getSelection()?.removeAllRanges();
    }, [selectedText]);

    const onChange = useCallback((content: string) => {
        // Content is now managed by blocks table via editor's documentId prop
        // This callback is kept for backward compatibility but does nothing
        // The editor will automatically sync blocks via its internal syncBlocks call
    }, []);

    if (document === undefined) {
        return (
            <div>
                <Cover.Skeleton />
                <div className="md:max-w-3xl lg:max-w-4xl mx-auto mt-10">
                    <div className="space-y-4 pl-8 pt-4">
                        <Skeleton className="h-14 w-[50%]" />
                        <Skeleton className="h-4 w-[80%]" />
                        <Skeleton className="h-4 w-[40%]" />
                        <Skeleton className="h-4 w-[60%]" />
                    </div>
                </div>
            </div>
        );
    }

    if (document === null) {
        notFound();
    }

    return (
        <div className={`pb-40 transition-all duration-300 ${showAIChat ? 'pr-96' : ''}`}>
            <Cover url={document.coverImage} />
            <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
                <Toolbar initialData={document} />
                {isBlocksLoading ? (
                    // Loading skeleton while blocks are being fetched
                    <div className="pl-8 pt-4 space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[95%]" />
                        <Skeleton className="h-4 w-[85%]" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[92%]" />
                    </div>
                ) : hasBlocks ? (
                    // Render editor with actual content
                    <Editor
                        key={documentId}
                        onChange={onChange}
                        initialContent={contentFromBlocks}
                        editable={true}
                        documentId={documentId}
                    />
                ) : (
                    // Empty state - render editor with empty content for editing
                    <Editor
                        key={documentId}
                        onChange={onChange}
                        initialContent={JSON.stringify([{ type: "paragraph", content: "" }], null, 2)}
                        editable={true}
                        documentId={documentId}
                    />
                )}
            </div>

            {/* AI Features */}
            <AIChatPanel
                isOpen={showAIChat}
                onClose={() => {
                    setShowAIChat(false);
                    setAiContextText(""); // Clear AI context when closing
                }}
                documentContent={contentFromBlocks || ""}
                documentTitle={document.title}
                selectedText={aiContextText}
                onClearSelection={() => setAiContextText("")}
            />
            <FloatingAIButton onClick={handleOpenAIChat} />

            {/* Ask AI about selection button - appears at selection position */}
            <SelectionAIButton
                selectedText={selectedText}
                onClick={handleOpenAIChat}
            />
        </div>
    );
}

// Memoize to prevent unnecessary re-renders when switching tabs
export const DocumentContent = memo(DocumentContentComponent);
