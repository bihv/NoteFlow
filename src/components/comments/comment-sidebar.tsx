"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CommentThread } from "./comment-thread";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronRight, ChevronLeft } from "lucide-react";
import { useState } from "react";

interface CommentSidebarProps {
    documentId: Id<"documents">;
    currentUserId: string;
    currentUserName: string;
    onCommentClick?: (commentId: Id<"comments">) => void;
    onExpandRequest?: (expandFn: () => void) => void;
}

export function CommentSidebar({
    documentId,
    currentUserId,
    currentUserName,
    onCommentClick,
    onExpandRequest
}: CommentSidebarProps) {
    const comments = useQuery(api.documents.getDocumentComments, { documentId });
    const [showResolved, setShowResolved] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Handle external expand requests
    const handleExpand = () => {
        setIsCollapsed(false);
    };

    // Provide expand function to parent via callback
    useState(() => {
        if (onExpandRequest) {
            onExpandRequest(handleExpand);
        }
    });

    if (!comments) {
        return (
            <div className={`border-l bg-muted/20 p-4 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
                {isCollapsed ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(false)}
                        className="w-full p-0"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="h-5 w-5" />
                            <h3 className="font-semibold">Comments</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </>
                )}
            </div>
        );
    }

    // Group comments by thread (root comments only)
    const rootComments = comments.filter((c) => !c.parentCommentId);
    const visibleComments = showResolved
        ? rootComments
        : rootComments.filter((c) => !c.isResolved);

    return (
        <div className={`border-l bg-background overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
            {isCollapsed ? (
                <div className="p-2 flex flex-col items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExpand}
                        className="w-full p-2"
                        title="Expand comments"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{visibleComments.length}</span>
                    </div>
                </div>
            ) : (
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            <h3 className="font-semibold">Comments</h3>
                            <span className="text-xs text-muted-foreground">
                                ({visibleComments.length})
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCollapsed(true)}
                            className="h-6 w-6 p-0"
                            title="Collapse sidebar"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowResolved(!showResolved)}
                            className="w-full justify-start text-xs"
                        >
                            {showResolved ? "Hide" : "Show"} resolved
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {visibleComments.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No comments yet
                            </p>
                        ) : (
                            visibleComments.map((comment) => (
                                <div
                                    key={comment._id}
                                    onClick={() => onCommentClick?.(comment._id)}
                                    className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
                                >
                                    <CommentThread
                                        comment={comment}
                                        allComments={comments}
                                        currentUserId={currentUserId}
                                        currentUserName={currentUserName}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
