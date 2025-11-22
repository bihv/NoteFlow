"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "@/components/editor";
import { Cover } from "@/app/[locale]/(main)/documents/[documentId]/cover";
import { Toolbar } from "@/app/[locale]/(main)/documents/[documentId]/toolbar";
import { toast } from "sonner";
import { CommentSidebar } from "@/components/comments/comment-sidebar";
import { AddCommentButton } from "@/components/comments/add-comment-button";
import { CommentHighlights, scrollToComment } from "@/components/comments/comment-highlights";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SharePageProps {
    params: Promise<{
        shareId: string;
    }>;
}

const SharePage = ({ params }: SharePageProps) => {
    const { shareId } = use(params);

    const document = useQuery(api.documents.getSharedDocument, {
        shareUrl: shareId,
    });

    const update = useMutation(api.documents.update);
    const [isSaving, setIsSaving] = useState(false);
    const [userName, setUserName] = useState<string>("");
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [shouldExpandSidebar, setShouldExpandSidebar] = useState(false);
    const sidebarExpandRef = useRef<(() => void) | undefined>(undefined);

    // Determine if editable based on permission
    const isEditable = document?.sharePermission === "edit";
    const canComment = document?.sharePermission === "comment" || isEditable;

    // Load username from localStorage
    useEffect(() => {
        const savedName = localStorage.getItem("anonymousUserName");
        if (savedName) {
            setUserName(savedName);
        } else if (canComment) {
            setShowNamePrompt(true);
        }
    }, [canComment]);

    // Update window title
    useEffect(() => {
        if (document?.title) {
            window.document.title = `${document.title} - Nova`;
        }
    }, [document?.title]);

    const handleSaveName = () => {
        if (userName.trim()) {
            localStorage.setItem("anonymousUserName", userName.trim());
            setShowNamePrompt(false);
        }
    };

    const onChange = async (content: string) => {
        if (!isEditable || !document) return;

        setIsSaving(true);
        try {
            await update({
                id: document._id,
                content,
            });
        } catch (error) {
            console.error("Failed to save:", error);
            toast.error("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

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
        return (
            <div className="h-full flex items-center justify-center flex-col gap-4">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Document not found</h1>
                    <p className="text-muted-foreground">
                        This document doesn&apos;t exist, has been deleted, or the share link
                        has expired.
                    </p>
                </div>
            </div>
        );
    }

    // Generate anonymous user ID based on share session
    const anonymousUserId = `anon-${shareId}`;

    const handleCommentClick = (commentId: Id<"comments">) => {
        scrollToComment(commentId);
    };

    const handleHighlightClick = (commentId: Id<"comments">) => {
        console.log("Highlight clicked, comment ID:", commentId);

        // Trigger sidebar expansion first
        if (sidebarExpandRef.current) {
            sidebarExpandRef.current();
        }

        // Find comment thread element
        const commentElement = window.document.querySelector(`[data-comment-thread-id="${commentId}"]`) as HTMLElement;
        console.log("Comment element found:", commentElement);

        if (commentElement) {
            // Get sidebar container
            const sidebarContainer = commentElement.closest('.overflow-y-auto') as HTMLElement;
            console.log("Sidebar container:", sidebarContainer);

            if (sidebarContainer) {
                // Wait a bit for sidebar to expand if collapsed
                setTimeout(() => {
                    // Get positions using getBoundingClientRect for accuracy
                    const commentRect = commentElement.getBoundingClientRect();
                    const containerRect = sidebarContainer.getBoundingClientRect();

                    // Calculate how much to scroll
                    const currentScroll = sidebarContainer.scrollTop;
                    const commentRelativeTop = commentRect.top - containerRect.top;
                    const targetScroll = currentScroll + commentRelativeTop - (containerRect.height / 2) + (commentRect.height / 2);

                    console.log("Scroll calculation:", {
                        currentScroll,
                        commentRelativeTop,
                        targetScroll,
                        containerHeight: containerRect.height
                    });

                    // Smooth scroll sidebar
                    sidebarContainer.scrollTo({
                        top: targetScroll,
                        behavior: 'smooth'
                    });
                }, 100);
            } else {
                // Fallback to scrollIntoView
                commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
            }

            // Remove existing flash classes first
            commentElement.classList.remove("ring-2", "ring-primary");

            // Flash the comment to draw attention (with a small delay to ensure classes are removed)
            setTimeout(() => {
                commentElement.classList.add("ring-2", "ring-primary", "ring-offset-2");
                setTimeout(() => {
                    commentElement.classList.remove("ring-2", "ring-primary", "ring-offset-2");
                }, 2000);
            }, 50);
        } else {
            console.warn("Comment thread not found for ID:", commentId);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Name prompt modal */}
            {showNamePrompt && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center">
                    <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Enter your name</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            To add comments, please enter your name
                        </p>
                        <Input
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Your name"
                            className="mb-4"
                            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                        />
                        <Button onClick={handleSaveName} className="w-full">
                            Continue
                        </Button>
                    </div>
                </div>
            )}

            {/* Main content - independent scroll */}
            <div className="flex-1 overflow-y-auto">
                <div className="pb-40">
                    <Cover url={document.coverImage} preview={!isEditable} />
                    <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
                        {/* Document Header */}
                        <Toolbar initialData={document} preview={!isEditable} />

                        {/* Editor with permission-based editability */}
                        <div id="editor-container">
                            <Editor
                                onChange={onChange}
                                initialContent={document.content}
                                editable={isEditable}
                            />
                        </div>

                        {/* Footer info */}
                        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
                            <p>
                                This is a shared document.{" "}
                                {isEditable && "You can edit this document."}
                                {canComment && !isEditable && "You can add comments."}
                                {!canComment && !isEditable && "View only."}
                                {isSaving && " Saving..."}
                            </p>
                            {document.sharePermission && (
                                <p className="mt-1">
                                    Permission: {document.sharePermission === "view" && "View Only"}
                                    {document.sharePermission === "comment" && "Can Comment"}
                                    {document.sharePermission === "edit" && "Can Edit"}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Add comment button (floats on selection) */}
                    {canComment && userName && (
                        <AddCommentButton
                            documentId={document._id}
                            currentUserId={anonymousUserId}
                            currentUserName={userName}
                        />
                    )}

                    {/* Comment highlights overlay */}
                    {canComment && userName && (
                        <CommentHighlights
                            documentId={document._id}
                            onHighlightClick={handleHighlightClick}
                        />
                    )}
                </div>
            </div>

            {/* Comment Sidebar - independent scroll */}
            {canComment && userName && (
                <CommentSidebar
                    documentId={document._id}
                    currentUserId={anonymousUserId}
                    currentUserName={userName}
                    onCommentClick={handleCommentClick}
                    onExpandRequest={(expandFn) => {
                        sidebarExpandRef.current = expandFn;
                    }}
                />
            )}
        </div>
    );
};

export default SharePage;
