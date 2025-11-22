"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Edit, ArrowRight, Clipboard } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { expandText, improveText, continueText } from "@/lib/ai-generate-client";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

interface SelectionAIDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (content: string, replace?: boolean) => void;
    type: 'expand' | 'improve' | 'continue' | null;
    selectedText: string;
}

const AI_CONFIG = {
    expand: {
        title: "Expand Selection",
        icon: Sparkles,
        description: "Expanding brief points into detailed content...",
        action: expandText,
        shouldReplace: true,
    },
    improve: {
        title: "Improve Writing",
        icon: Edit,
        description: "Improving grammar and clarity...",
        action: improveText,
        shouldReplace: true,
    },
    continue: {
        title: "Continue Writing",
        icon: ArrowRight,
        description: "Continuing from where you left off...",
        action: continueText,
        shouldReplace: false,
    },
};

export const SelectionAIDialog = ({ isOpen, onClose, onInsert, type, selectedText }: SelectionAIDialogProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");
    const abortController = new AbortController();

    const config = type ? AI_CONFIG[type] : null;
    const Icon = config?.icon || Sparkles;

    // Auto-generate when dialog opens
    useEffect(() => {
        if (isOpen && type && selectedText && !generatedContent) {
            handleGenerate();
        }
    }, [isOpen, type]);

    const handleGenerate = async () => {
        if (!type || !config) return;

        setIsGenerating(true);
        setGeneratedContent("");

        await config.action(
            selectedText,
            {
                onChunk: (text) => setGeneratedContent((prev) => prev + text),
                onComplete: () => {
                    setIsGenerating(false);
                    toast.success("Content generated!");
                },
                onError: (error) => {
                    setIsGenerating(false);
                    toast.error(error);
                },
            },
            abortController.signal
        );
    };

    const handleInsert = () => {
        if (generatedContent && config) {
            onInsert(generatedContent, config.shouldReplace);
            handleClose();
        }
    };

    const handleClose = () => {
        abortController.abort();
        onClose();
        setGeneratedContent("");
        setIsGenerating(false);
    };

    if (!config) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-purple-600" />
                        {config.title}
                    </DialogTitle>
                    <DialogDescription>
                        {isGenerating ? config.description : "Review the generated content before inserting."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {/* Original Selection */}
                    <div className="border rounded-lg p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Original:</p>
                        <p className="text-sm">{selectedText}</p>
                    </div>

                    {/* Generated Content Preview */}
                    {(isGenerating || generatedContent) && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                                {isGenerating ? "Generating..." : "Generated Content:"}
                            </p>
                            <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto wrap-break-word">
                                {generatedContent ? (
                                    <MarkdownRenderer content={generatedContent} />
                                ) : (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons in Footer */}
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                        Cancel
                    </Button>
                    {generatedContent && (
                        <Button onClick={handleInsert} disabled={isGenerating}>
                            <Clipboard className="h-4 w-4 mr-2" />
                            {config.shouldReplace ? "Replace" : "Insert"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
