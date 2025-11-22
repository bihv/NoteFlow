"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, X } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface AddCommentButtonProps {
    documentId: Id<"documents">;
    currentUserId: string;
    currentUserName: string;
}

export function AddCommentButton({
    documentId,
    currentUserId,
    currentUserName,
}: AddCommentButtonProps) {
    const [showInput, setShowInput] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [selection, setSelection] = useState<{
        text: string;
        start: number;
        end: number;
    } | null>(null);
    const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);

    const addComment = useMutation(api.documents.addComment);

    useEffect(() => {
        const handleSelection = () => {
            // Small delay to ensure selection is complete
            setTimeout(() => {
                const sel = window.getSelection();

                // Don't clear if input modal is already showing
                if (showInput) {
                    return;
                }

                if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                    setSelection(null);
                    setButtonPosition(null);
                    return;
                }

                const selectedText = sel.toString().trim();
                if (selectedText.length === 0) {
                    setSelection(null);
                    setButtonPosition(null);
                    return;
                }

                // Get selection position
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                // Position button above selection
                const buttonX = rect.left + (rect.width / 2);
                const buttonY = rect.top + window.scrollY - 50;

                setSelection({
                    text: selectedText,
                    start: 0,
                    end: selectedText.length,
                });

                setButtonPosition({
                    x: buttonX,
                    y: buttonY,
                });
            }, 10);
        };

        document.addEventListener("mouseup", handleSelection);
        document.addEventListener("selectionchange", handleSelection);

        return () => {
            document.removeEventListener("mouseup", handleSelection);
            document.removeEventListener("selectionchange", handleSelection);
        };
    }, [showInput]);

    const handleAddComment = async () => {
        if (!selection || !commentText.trim()) {
            toast.error("Please enter a comment");
            return;
        }

        try {
            await addComment({
                documentId,
                content: commentText,
                authorId: currentUserId,
                authorName: currentUserName,
                selectionStart: selection.start,
                selectionEnd: selection.end,
                selectedText: selection.text,
            });

            toast.success("Comment added");
            setCommentText("");
            setShowInput(false);
            setSelection(null);
            setButtonPosition(null);

            // Clear selection
            window.getSelection()?.removeAllRanges();
        } catch (error) {
            console.error("Failed to add comment:", error);
            toast.error("Failed to add comment");
        }
    };

    const handleCancel = () => {
        setShowInput(false);
        setCommentText("");
        // Don't clear selection/position immediately to allow smooth transition
    };

    if (!selection || !buttonPosition) return null;

    return (
        <div
            className="fixed z-100"
            style={{
                left: `${buttonPosition.x}px`,
                top: `${buttonPosition.y}px`,
                transform: "translateX(-50%)",
            }}
        >
            {!showInput ? (
                <Button
                    size="sm"
                    onMouseDown={(e) => {
                        // Prevent button click from clearing selection
                        e.preventDefault();
                        setShowInput(true);
                    }}
                    className="shadow-lg bg-primary hover:bg-primary/90"
                >
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                    Add comment
                </Button>
            ) : (
                <div className="bg-card border rounded-lg shadow-2xl p-4 w-80">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 p-2 bg-muted/50 rounded text-xs italic mr-2">
                            "{selection.text.substring(0, 100)}{selection.text.length > 100 ? "..." : ""}"
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            className="h-6 w-6 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="mb-3 min-h-[80px]"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddComment} className="flex-1">
                            Comment
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
