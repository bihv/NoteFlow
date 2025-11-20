"use client";

import { useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface CommentHighlightsProps {
    documentId: Id<"documents">;
    onHighlightClick?: (commentId: Id<"comments">) => void;
}

export function CommentHighlights({ documentId, onHighlightClick }: CommentHighlightsProps) {
    const comments = useQuery(api.documents.getDocumentComments, { documentId });
    const highlightsRef = useRef<Map<Id<"comments">, HTMLSpanElement>>(new Map());
    const observerRef = useRef<MutationObserver | null>(null);

    const applyHighlights = () => {
        if (!comments || comments.length === 0) return;

        const editorContainer = document.getElementById("editor-container");
        if (!editorContainer) {
            // Retry after a delay if editor not ready
            setTimeout(applyHighlights, 100);
            return;
        }

        // IMPORTANT: Disconnect observer before applying to prevent infinite loop
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        // Clear existing highlights
        highlightsRef.current.forEach((span) => {
            const parent = span.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(span.textContent || ""), span);
                parent.normalize();
            }
        });
        highlightsRef.current.clear();

        // Apply new highlights
        comments.forEach((comment) => {
            if (comment.isResolved) return; // Don't highlight resolved comments

            const { selectedText } = comment;

            // Find text nodes containing the selected text
            const walker = document.createTreeWalker(
                editorContainer,
                NodeFilter.SHOW_TEXT,
                null
            );

            let node;
            while ((node = walker.nextNode())) {
                const text = node.textContent || "";
                const index = text.indexOf(selectedText);

                if (index !== -1 && node.parentElement) {
                    // Create highlight span
                    const range = document.createRange();
                    range.setStart(node, index);
                    range.setEnd(node, index + selectedText.length);

                    const highlight = document.createElement("span");
                    highlight.className = "bg-yellow-200/30 dark:bg-yellow-500/20 cursor-pointer hover:bg-yellow-200/50 dark:hover:bg-yellow-500/30 transition-colors relative rounded px-0.5";
                    highlight.setAttribute("data-comment-id", comment._id);

                    // Create a closure with the specific commentId
                    const commentId = comment._id;
                    const clickHandler = (e: Event) => {
                        console.log("=== HIGHLIGHT CLICKED ===");
                        console.log("Comment ID from handler:", commentId);
                        e.stopPropagation();
                        e.preventDefault();
                        if (onHighlightClick) {
                            onHighlightClick(commentId);
                        }
                    };

                    // Attach event listener
                    highlight.addEventListener("click", clickHandler, true);

                    try {
                        range.surroundContents(highlight);
                        highlightsRef.current.set(comment._id, highlight);
                    } catch (e) {
                        // Ignore if range spans multiple elements
                        console.warn("Could not highlight comment text:", e);
                    }

                    break; // Only highlight first occurrence
                }
            }
        });

        // Reconnect observer after applying highlights
        if (observerRef.current && editorContainer) {
            observerRef.current.observe(editorContainer, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }
    };

    useEffect(() => {
        // Initial application of highlights
        const timer = setTimeout(applyHighlights, 500);

        // Observe DOM changes to reapply highlights when editor re-renders
        const editorContainer = document.getElementById("editor-container");
        if (editorContainer) {
            observerRef.current = new MutationObserver(() => {
                // Debounce: only reapply after DOM settles
                setTimeout(applyHighlights, 100);
            });

            observerRef.current.observe(editorContainer, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }

        return () => {
            clearTimeout(timer);
            if (observerRef.current) {
                observerRef.current.disconnect();
            }

            // Cleanup highlights on unmount
            highlightsRef.current.forEach((span) => {
                const parent = span.parentNode;
                if (parent) {
                    parent.replaceChild(document.createTextNode(span.textContent || ""), span);
                    parent.normalize();
                }
            });
            highlightsRef.current.clear();
        };
    }, [comments, onHighlightClick]);

    // This component doesn't render anything visible
    return null;
}

// Export function to scroll to a specific comment
export function scrollToComment(commentId: Id<"comments">) {
    const highlight = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (highlight) {
        highlight.scrollIntoView({ behavior: "smooth", block: "center" });

        // Temporarily flash the highlight
        highlight.classList.add("ring-2", "ring-yellow-400");
        setTimeout(() => {
            highlight.classList.remove("ring-2", "ring-yellow-400");
        }, 2000);
    }
}
