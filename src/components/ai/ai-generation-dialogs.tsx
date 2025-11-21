"use client";

import { useState } from "react";
import { Sparkles, Loader2, FileText, Clipboard, Pencil, Lightbulb } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateTemplate, createOutline, customGenerate, type GenerateOptions } from "@/lib/ai-generate-client";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

// Outline Dialog
interface OutlineDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (content: string) => void;
}

export const OutlineDialog = ({ isOpen, onClose, onInsert }: OutlineDialogProps) => {
    const [topic, setTopic] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");
    const abortController = new AbortController();

    const handleGenerate = async () => {
        if (!topic.trim()) {
            toast.error("Please enter a topic");
            return;
        }

        setIsGenerating(true);
        setGeneratedContent("");

        await createOutline(
            topic,
            {
                onChunk: (text) => setGeneratedContent((prev) => prev + text),
                onComplete: () => {
                    setIsGenerating(false);
                    toast.success("Outline generated!");
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
        if (generatedContent) {
            onInsert(generatedContent);
            onClose();
            setTopic("");
            setGeneratedContent("");
        }
    };

    const handleClose = () => {
        abortController.abort();
        onClose();
        setTopic("");
        setGeneratedContent("");
        setIsGenerating(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Create Outline
                    </DialogTitle>
                    <DialogDescription>
                        Enter a topic and AI will generate a comprehensive outline.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Machine Learning Basics"
                            disabled={isGenerating}
                            onKeyDown={(e) => e.key === "Enter" && !isGenerating && handleGenerate()}
                        />
                    </div>

                    {generatedContent && (
                        <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto break-words">
                            <MarkdownRenderer content={generatedContent} />
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                            Cancel
                        </Button>
                        {!generatedContent ? (
                            <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()}>
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button onClick={handleInsert}>
                                <Clipboard className="h-4 w-4 mr-2" />
                                Insert
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Template Dialog
interface TemplateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (content: string) => void;
}

const TEMPLATES = [
    {
        type: "meeting-notes" as const,
        title: "Meeting Notes",
        icon: Clipboard,
        description: "Structured template for meeting documentation",
    },
    {
        type: "project-plan" as const,
        title: "Project Plan",
        icon: FileText,
        description: "Comprehensive project planning template",
    },
    {
        type: "blog-post" as const,
        title: "Blog Post",
        icon: Pencil,
        description: "Template for writing blog articles",
    },
    {
        type: "brainstorm" as const,
        title: "Brainstorm",
        icon: Lightbulb,
        description: "Template for ideation and brainstorming",
    },
];

export const TemplateDialog = ({ isOpen, onClose, onInsert }: TemplateDialogProps) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState("");
    const [topic, setTopic] = useState("");
    const [language, setLanguage] = useState<'auto' | 'vi' | 'en'>('auto');
    const [step, setStep] = useState<'select' | 'customize' | 'preview'>('select');
    const abortController = new AbortController();

    const handleTemplateSelect = (templateType: GenerateOptions['templateType']) => {
        setSelectedTemplate(templateType!);
        setStep('customize');
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGeneratedContent("");
        setStep('preview');

        await generateTemplate(
            selectedTemplate as any,
            {
                onChunk: (text) => {
                    setGeneratedContent((prev) => prev + text);
                },
                onComplete: () => {
                    setIsGenerating(false);
                    toast.success("Template generated!");
                },
                onError: (error) => {
                    setIsGenerating(false);
                    setSelectedTemplate(null);
                    setStep('select');
                    toast.error(error);
                },
            },
            abortController.signal,
            topic || undefined,
            language
        );
    };

    const handleInsert = () => {
        if (generatedContent) {
            onInsert(generatedContent);
            onClose();
            handleReset();
        }
    };

    const handleReset = () => {
        setSelectedTemplate(null);
        setGeneratedContent("");
        setTopic("");
        setLanguage('auto');
        setStep('select');
    };

    const handleClose = () => {
        abortController.abort();
        onClose();
        handleReset();
        setIsGenerating(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Insert Template
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'select' && 'Choose a template to generate.'}
                        {step === 'customize' && 'Customize your template before generating.'}
                        {step === 'preview' && 'Review the generated content before inserting.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Step 1: Select Template */}
                    {step === 'select' && (
                        <div className="grid grid-cols-2 gap-3">
                            {TEMPLATES.map((template) => {
                                const Icon = template.icon;
                                return (
                                    <button
                                        key={template.type}
                                        onClick={() => handleTemplateSelect(template.type)}
                                        className="p-4 border-2 rounded-lg text-left transition-all hover:border-purple-500 border-gray-200"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Icon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="font-semibold text-sm mb-1">{template.title}</h3>
                                                <p className="text-xs text-muted-foreground">{template.description}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 2: Customize Template */}
                    {step === 'customize' && selectedTemplate && (
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4">
                                <p className="text-sm font-semibold mb-2">
                                    Selected: {TEMPLATES.find(t => t.type === selectedTemplate)?.title}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Topic or Context (optional)
                                </label>
                                <Input
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., Q4 Marketing Planning Meeting"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Language
                                </label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as 'auto' | 'vi' | 'en')}
                                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="auto">Auto-detect</option>
                                    <option value="vi">Tiếng Việt</option>
                                    <option value="en">English</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setStep('select')}>
                                    Back
                                </Button>
                                <Button onClick={handleGenerate}>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generate
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview Generated Content */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto break-words">
                                {generatedContent ? (
                                    <MarkdownRenderer content={generatedContent} />
                                ) : (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                                    </div>
                                )}
                            </div>

                            {!isGenerating && generatedContent && (
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => {
                                        setStep('customize');
                                        setGeneratedContent('');
                                    }}>
                                        Back
                                    </Button>
                                    <Button onClick={handleInsert}>
                                        <Clipboard className="h-4 w-4 mr-2" />
                                        Insert
                                    </Button>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="text-center text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                    Generating template...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Custom Prompt Dialog
interface CustomPromptDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (content: string) => void;
    selectedText?: string;
}

export const CustomPromptDialog = ({ isOpen, onClose, onInsert, selectedText }: CustomPromptDialogProps) => {
    const [prompt, setPrompt] = useState("");
    const [useContext, setUseContext] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");
    const abortController = new AbortController();

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        setIsGenerating(true);
        setGeneratedContent("");

        await customGenerate(
            prompt,
            useContext ? selectedText : undefined,
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
        if (generatedContent) {
            onInsert(generatedContent);
            onClose();
            setPrompt("");
            setGeneratedContent("");
        }
    };

    const handleClose = () => {
        abortController.abort();
        onClose();
        setPrompt("");
        setGeneratedContent("");
        setIsGenerating(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Custom Generation
                    </DialogTitle>
                    <DialogDescription>
                        Describe what you want AI to generate.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Write a professional email thanking a client for their business..."
                            disabled={isGenerating}
                            rows={3}
                        />
                    </div>

                    {selectedText && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="useContext"
                                checked={useContext}
                                onChange={(e) => setUseContext(e.target.checked)}
                                disabled={isGenerating}
                                className="rounded"
                            />
                            <label htmlFor="useContext" className="text-sm text-muted-foreground cursor-pointer">
                                Use selected text as context
                            </label>
                        </div>
                    )}

                    {generatedContent && (
                        <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto break-words">
                            <MarkdownRenderer content={generatedContent} />
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                            Cancel
                        </Button>
                        {!generatedContent ? (
                            <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button onClick={handleInsert}>
                                <Clipboard className="h-4 w-4 mr-2" />
                                Insert
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
