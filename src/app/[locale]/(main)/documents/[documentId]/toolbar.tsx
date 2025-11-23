"use client";

import { useRef, useState, useEffect } from "react";
import { ImageIcon, Smile, X, Share2, Loader2, Tags } from "lucide-react";
import { useMutation } from "convex/react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { Doc } from "@/convex/_generated/dataModel";
import { IconPicker } from "./icon-picker";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { ShareModal } from "@/components/modals/share-modal";
import { TagBadge } from "@/components/ui/tag-badge";
import { TagsModal } from "@/components/modals/tags-modal";

interface ToolbarProps {
    initialData: Doc<"documents">;
    preview?: boolean;
}

export const Toolbar = ({ initialData, preview }: ToolbarProps) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialData.title);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [showTagsModal, setShowTagsModal] = useState(false);

    const update = useMutation(api.documents.update);
    const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync local value with server when not editing
    useEffect(() => {
        if (!isEditing) {
            setValue(initialData.title);
        }
    }, [initialData.title, isEditing]);

    // Debounce title updates to prevent flicker
    useEffect(() => {
        // Clear previous timer
        if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
        }

        // Only update if value is different from server
        if (value !== initialData.title) {
            updateTimerRef.current = setTimeout(() => {
                update({
                    id: initialData._id,
                    title: value || "Untitled",
                });
            }, 500); // Wait 500ms after user stops typing
        }

        return () => {
            if (updateTimerRef.current) {
                clearTimeout(updateTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const enableInput = () => {
        if (preview) return;

        setIsEditing(true);
        setTimeout(() => {
            setValue(initialData.title);
            inputRef.current?.focus();
        }, 0);
    };

    const disableInput = () => setIsEditing(false);

    const onInput = (value: string) => {
        setValue(value); // Update local state immediately for smooth typing
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            disableInput();
        }
    };

    const onIconSelect = (icon: string) => {
        update({
            id: initialData._id,
            icon,
        });
    };

    const onRemoveIcon = () => {
        update({
            id: initialData._id,
            icon: "",
        });
    };
    const onAddCover = async () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                setIsUploadingCover(true);
                // Upload to Cloudinary
                const formData = new FormData();
                formData.append("file", file);

                try {
                    toast.loading("Uploading cover image...", { id: "cover-upload" });

                    const response = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error("Upload failed");
                    }

                    const data = await response.json();

                    // Update document with Cloudinary URL
                    update({
                        id: initialData._id,
                        coverImage: data.secure_url,
                    });

                    toast.success("Cover image uploaded successfully!", { id: "cover-upload" });
                } catch (error) {
                    console.error("Error uploading image:", error);
                    toast.error("Failed to upload image. Please try again.", { id: "cover-upload" });
                } finally {
                    setIsUploadingCover(false);
                }
            }
        };
        input.click();
    };

    const handleUpdateTags = async (newTags: string[]) => {
        await update({
            id: initialData._id,
            tags: newTags,
        });
    };

    return (
        <div className="group relative">
            <TagsModal
                isOpen={showTagsModal}
                onClose={() => setShowTagsModal(false)}
                tags={initialData.tags || []}
                onUpdateTags={handleUpdateTags}
                documentTitle={initialData.title}
            />
            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                document={initialData}
            />

            {/* Facebook-style Layout: Icon as Avatar + Title + Actions */}
            <div className="px-6 pb-4">
                {/* Icon + Title Row (Facebook profile style) */}
                <div className="flex items-end justify-between gap-4 -mt-8">
                    {/* Left: Icon (Avatar-style) + Title */}
                    <div className="flex items-end gap-4 flex-1 min-w-0">
                        {/* Icon as Avatar */}
                        {!!initialData.icon && !preview && (
                            <div className="relative group/icon flex-shrink-0">
                                <IconPicker onChange={onIconSelect}>
                                    <div className="w-32 h-32 flex items-center justify-center text-8xl hover:scale-105 transform duration-200 cursor-pointer">
                                        {initialData.icon}
                                    </div>
                                </IconPicker>
                                <Button
                                    onClick={onRemoveIcon}
                                    className="absolute -top-2 -right-2 rounded-full opacity-0 group-hover/icon:opacity-100 transition text-destructive bg-background hover:bg-destructive/10 border-destructive/50 shadow-md"
                                    variant="outline"
                                    size="icon"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        {!!initialData.icon && preview && (
                            <div className="w-32 h-32 flex items-center justify-center text-8xl flex-shrink-0">
                                {initialData.icon}
                            </div>
                        )}

                        {/* Title + Quick Actions */}
                        <div className="flex-1 min-w-0 pb-2">
                            {/* Title */}
                            {isEditing && !preview ? (
                                <TextareaAutosize
                                    ref={inputRef}
                                    onBlur={disableInput}
                                    onKeyDown={onKeyDown}
                                    value={value}
                                    onChange={(e) => onInput(e.target.value)}
                                    className="text-4xl bg-transparent font-bold wrap-break-word outline-hidden resize-none w-full leading-tight"
                                    style={{ color: 'currentColor' }}
                                />
                            ) : (
                                <div
                                    onClick={enableInput}
                                    className="text-4xl font-bold wrap-break-word outline-hidden w-full cursor-pointer leading-tight hover:opacity-80 transition-opacity truncate"
                                    style={{ color: 'currentColor' }}
                                >
                                    {initialData.title}
                                </div>
                            )}

                            {/* Quick Add Icon/Cover Buttons (only show when no icon/cover) */}
                            {!preview && (
                                <div className="flex items-center gap-2 mt-2">
                                    {!initialData.icon && (
                                        <IconPicker asChild onChange={onIconSelect}>
                                            <Button
                                                className="text-muted-foreground text-xs h-7"
                                                variant="ghost"
                                                size="sm"
                                            >
                                                <Smile className="h-3.5 w-3.5 mr-1.5" />
                                                Add icon
                                            </Button>
                                        </IconPicker>
                                    )}
                                    {!initialData.coverImage && (
                                        <Button
                                            onClick={onAddCover}
                                            disabled={isUploadingCover}
                                            className="text-muted-foreground text-xs h-7"
                                            variant="ghost"
                                            size="sm"
                                        >
                                            {isUploadingCover ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                                                    Add cover
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Action Buttons */}
                    {!preview && (
                        <div className="flex items-center gap-2 pb-2">
                            <Button
                                onClick={() => setShowTagsModal(true)}
                                className="hover:scale-105 transition-transform duration-200"
                                variant="outline"
                                size="sm"
                            >
                                <Tags className="h-4 w-4 mr-2" />
                                Tags
                            </Button>
                            <Button
                                onClick={() => setShowShareModal(true)}
                                className="hover:scale-105 transition-transform duration-200"
                                variant="default"
                                size="sm"
                            >
                                <Share2 className="h-4 w-4 mr-2" />
                                {initialData.shareEnabled ? "Manage" : "Share"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tags Display */}
            {initialData.tags && initialData.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4 mb-6">
                    {initialData.tags.map((tag, index) => (
                        <TagBadge
                            key={index}
                            tag={tag}
                            variant="primary"
                            onRemove={!preview ? async () => {
                                const newTags = initialData.tags?.filter((_, i) => i !== index) || [];
                                await update({
                                    id: initialData._id,
                                    tags: newTags,
                                });
                            } : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
