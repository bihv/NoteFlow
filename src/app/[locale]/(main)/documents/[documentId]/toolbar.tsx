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
        <div className="pl-[54px] group relative">
            <TagsModal
                isOpen={showTagsModal}
                onClose={() => setShowTagsModal(false)}
                tags={initialData.tags || []}
                onUpdateTags={handleUpdateTags}
                documentContent={initialData.content}
                documentTitle={initialData.title}
            />
            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                document={initialData}
            />

            {!!initialData.icon && !preview && (
                <div className="flex items-center gap-x-2 group/icon pt-6">
                    <IconPicker onChange={onIconSelect}>
                        <p className="text-6xl hover:opacity-75 transition">
                            {initialData.icon}
                        </p>
                    </IconPicker>
                    <Button
                        onClick={onRemoveIcon}
                        className="rounded-full opacity-0 group-hover/icon:opacity-100 transition text-muted-foreground text-xs"
                        variant="outline"
                        size="icon"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {!!initialData.icon && preview && (
                <p className="text-6xl pt-6">{initialData.icon}</p>
            )}
            <div className="flex items-center gap-x-1 py-4">
                {!initialData.icon && !preview && (
                    <IconPicker asChild onChange={onIconSelect}>
                        <Button
                            className="text-muted-foreground text-xs"
                            variant="outline"
                            size="sm"
                        >
                            <Smile className="h-4 w-4 mr-2" />
                            Add icon
                        </Button>
                    </IconPicker>
                )}
                {!initialData.coverImage && !preview && (
                    <Button
                        onClick={onAddCover}
                        disabled={isUploadingCover}
                        className="text-muted-foreground text-xs"
                        variant="outline"
                        size="sm"
                    >
                        {isUploadingCover ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Add cover
                            </>
                        )}
                    </Button>
                )}
                {!preview && (
                    <>
                        <Button
                            onClick={() => setShowTagsModal(true)}
                            className="text-muted-foreground text-xs"
                            variant="outline"
                            size="sm"
                        >
                            <Tags className="h-4 w-4 mr-2" />
                            Tags
                        </Button>
                        <Button
                            onClick={() => setShowShareModal(true)}
                            className="text-muted-foreground text-xs"
                            variant="outline"
                            size="sm"
                        >
                            <Share2 className="h-4 w-4 mr-2" />
                            {initialData.shareEnabled ? "Manage sharing" : "Share"}
                        </Button>
                    </>
                )}
            </div>
            {isEditing && !preview ? (
                <TextareaAutosize
                    ref={inputRef}
                    onBlur={disableInput}
                    onKeyDown={onKeyDown}
                    value={value}
                    onChange={(e) => onInput(e.target.value)}
                    className="text-5xl bg-transparent font-bold break-words outline-none resize-none w-full text-center leading-tight"
                    style={{ color: 'currentColor' }}
                />
            ) : (
                <div
                    onClick={enableInput}
                    className="pb-[11.5px] text-5xl font-bold break-words outline-none w-full text-center cursor-pointer leading-tight"
                    style={{ color: 'currentColor' }}
                >
                    {initialData.title}
                </div>
            )}

            {/* Tags Display */}
            {initialData.tags && initialData.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-8 mb-6">
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
