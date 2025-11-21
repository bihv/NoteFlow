"use client";

import { useState } from "react";
import { X, Plus, Sparkles, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagBadge } from "@/components/ui/tag-badge";
import { toast } from "sonner";

interface TagsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tags: string[];
    onUpdateTags: (tags: string[]) => void;
    documentContent?: string;
    documentTitle?: string;
}

export const TagsModal = ({
    isOpen,
    onClose,
    tags,
    onUpdateTags,
    documentContent,
    documentTitle,
}: TagsModalProps) => {
    const [inputValue, setInputValue] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAddTag = () => {
        const tag = inputValue.trim().toLowerCase();

        if (!tag) {
            toast.error("Tag cannot be empty");
            return;
        }

        if (tags.includes(tag)) {
            toast.error("Tag already exists");
            return;
        }

        if (tag.length > 30) {
            toast.error("Tag is too long (max 30 characters)");
            return;
        }

        onUpdateTags([...tags, tag]);
        setInputValue("");
        toast.success("Tag added");
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onUpdateTags(tags.filter(t => t !== tagToRemove));
        toast.success("Tag removed");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleAutoTag = async () => {
        if (!documentContent) {
            toast.error("Document is empty");
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch("/api/ai/auto-tag", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: documentContent,
                    title: documentTitle,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate tags");
            }

            // Merge AI tags with existing tags (avoid duplicates)
            const newTags = data.tags.filter((tag: string) => !tags.includes(tag));
            if (newTags.length > 0) {
                onUpdateTags([...tags, ...newTags]);
                toast.success(`Added ${newTags.length} AI-generated tags`);
            } else {
                toast.info("No new tags generated");
            }
        } catch (error: any) {
            console.error("Auto-tag error:", error);
            toast.error(error.message || "Failed to generate tags");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <span className="text-2xl">🏷️</span>
                        Manage Tags
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Add tags to organize your document. Use AI or add manually.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Add Tag Input */}
                    <div className="flex gap-2">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter a tag..."
                            className="flex-1"
                        />
                        <Button
                            onClick={handleAddTag}
                            size="icon"
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* AI Auto-Tag Button */}
                    <Button
                        onClick={handleAutoTag}
                        disabled={isGenerating || !documentContent}
                        variant="outline"
                        className="w-full"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating tags...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                                Generate tags with AI
                            </>
                        )}
                    </Button>

                    {/* Tags List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">
                                Your Tags
                            </h3>
                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                                {tags.length}
                            </span>
                        </div>
                        {tags.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                <div className="text-3xl mb-2">🏷️</div>
                                <p className="text-sm text-muted-foreground">
                                    No tags yet. Add one above!
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-3 border rounded-lg">
                                {tags.map((tag, index) => (
                                    <TagBadge
                                        key={index}
                                        tag={tag}
                                        variant="primary"
                                        onRemove={() => handleRemoveTag(tag)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={onClose}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
