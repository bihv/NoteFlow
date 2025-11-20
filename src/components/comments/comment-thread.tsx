"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Trash2, Reply } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CommentThreadProps {
    comment: Doc<"comments">;
    allComments: Doc<"comments">[];
    currentUserId: string;
    currentUserName: string;
}

export function CommentThread({
    comment,
    allComments,
    currentUserId,
    currentUserName,
}: CommentThreadProps) {
    const [isReply, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");

    const addComment = useMutation(api.documents.addComment);
    const resolveComment = useMutation(api.documents.resolveComment);
    const deleteComment = useMutation(api.documents.deleteComment);

    const replies = allComments.filter((c) => c.parentCommentId === comment._id);

    const handleReply = async () => {
        if (!replyText.trim()) return;

        try {
            await addComment({
                documentId: comment.documentId,
                content: replyText,
                authorId: currentUserId,
                authorName: currentUserName,
                selectionStart: comment.selectionStart,
                selectionEnd: comment.selectionEnd,
                selectedText: comment.selectedText,
                parentCommentId: comment._id,
            });
            setReplyText("");
            setIsReplying(false);
            toast.success("Reply added");
        } catch (error) {
            toast.error("Failed to add reply");
        }
    };

    const handleResolve = async () => {
        try {
            await resolveComment({
                commentId: comment._id,
                resolvedBy: currentUserId,
            });
            toast.success(comment.isResolved ? "Unresolved" : "Resolved");
        } catch (error) {
            toast.error("Failed to resolve comment");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this comment and all replies?")) return;

        try {
            await deleteComment({
                commentId: comment._id,
                userId: currentUserId,
            });
            toast.success("Comment deleted");
        } catch (error) {
            toast.error("Failed to delete comment");
        }
    };

    return (
        <div
            className={`p-3 rounded-lg border ${comment.isResolved ? "bg-muted/50" : "bg-card"}`}
            data-comment-thread-id={comment._id}
        >
            {/* Selected text preview */}
            <div className="mb-2 p-2 bg-muted/50 rounded text-xs italic">
                "{comment.selectedText}"
            </div>

            {/* Comment */}
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(comment._creationTime, { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsReplying(!isReply)}
                        className="h-7 px-2 text-xs"
                    >
                        <Reply className="h-3 w-3 mr-1" />
                        Reply
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResolve}
                        className="h-7 px-2 text-xs"
                    >
                        <Check className="h-3 w-3 mr-1" />
                        {comment.isResolved ? "Unresolve" : "Resolve"}
                    </Button>
                    {comment.authorId === currentUserId && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                        </Button>
                    )}
                </div>

                {/* Reply input */}
                {isReply && (
                    <div className="mt-2 space-y-2">
                        <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="min-h-[60px] text-sm"
                        />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleReply}>
                                Reply
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setIsReplying(false);
                                    setReplyText("");
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Replies */}
                {replies.length > 0 && (
                    <div className="ml-4 mt-3 space-y-3 border-l-2 pl-3">
                        {replies.map((reply) => (
                            <div key={reply._id} className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{reply.authorName}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(reply._creationTime, { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm">{reply.content}</p>
                                {reply.authorId === currentUserId && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            deleteComment({
                                                commentId: reply._id,
                                                userId: currentUserId,
                                            })
                                        }
                                        className="h-6 px-2 text-xs text-muted-foreground"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
