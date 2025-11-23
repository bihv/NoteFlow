"use client";

import { useTheme } from "next-themes";
import { BlockNoteEditor, PartialBlock, BlockNoteSchema, createCodeBlockSpec, Block } from "@blocknote/core";
import {
    useCreateBlockNote,
    SuggestionMenuController,
    getDefaultReactSlashMenuItems,
    FormattingToolbarController,
    FormattingToolbar,
    useComponentsContext,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { codeBlockOptions } from "@blocknote/code-block";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles, Edit, ArrowRight, FileText, Layout, MessageSquare } from "lucide-react";
import { OutlineDialog, TemplateDialog, CustomPromptDialog } from "@/components/ai/ai-generation-dialogs";
import { SelectionAIDialog } from "@/components/ai/selection-ai-dialog";
import { expandText, improveText, continueText } from "@/lib/ai-generate-client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export interface EditorProps {
    onChange: (value: string) => void;
    initialContent?: string;
    editable?: boolean;
    documentId?: Id<"documents">; // Optional for now (for backward compatibility)
}

export const Editor = ({ onChange, initialContent, editable, documentId }: EditorProps) => {
    const { resolvedTheme } = useTheme();
    const previousImagesRef = useRef<Set<string>>(new Set());
    const isInitializedRef = useRef(false);

    // Block sync mutation (optional - may not exist if types not generated yet)
    const syncBlocks = useMutation(
        (api as any).blocks?.syncBlocks || (() => Promise.resolve())
    );

    // AI generation dialog states
    const [showOutlineDialog, setShowOutlineDialog] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [showCustomDialog, setShowCustomDialog] = useState(false);
    const [showSelectionDialog, setShowSelectionDialog] = useState(false);
    const [selectionDialogType, setSelectionDialogType] = useState<'expand' | 'improve' | 'continue' | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const editorRef = useRef<BlockNoteEditor | null>(null);

    const uploadFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);

        // Generate unique toast ID for this upload
        const toastId = `upload-${Date.now()}`;

        try {
            toast.loading("Uploading image...", { id: toastId });

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const data = await response.json();
            toast.success("Image uploaded successfully!", { id: toastId });
            return data.secure_url;
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image. Please try again.", { id: toastId });
            throw error;
        }
    };

    const editor: BlockNoteEditor = useCreateBlockNote({
        schema: BlockNoteSchema.create().extend({
            blockSpecs: {
                codeBlock: createCodeBlockSpec(codeBlockOptions),
            },
        }),
        initialContent: initialContent
            ? (JSON.parse(initialContent) as PartialBlock[])
            : undefined,
        uploadFile,
    });

    // Extract image URLs from editor content
    const extractImageUrls = (blocks: any[]): Set<string> => {
        const urls = new Set<string>();
        const traverse = (block: any) => {
            if (block.type === "image" && block.props?.url) {
                urls.add(block.props.url);
            }
            if (block.children) {
                block.children.forEach(traverse);
            }
        };
        blocks.forEach(traverse);
        return urls;
    };

    // Delete removed images from Cloudinary
    const deleteRemovedImages = async (currentUrls: Set<string>) => {
        const removedUrls = Array.from(previousImagesRef.current).filter(
            (url) => !currentUrls.has(url)
        );

        for (const url of removedUrls) {
            // Only delete if it's a Cloudinary URL
            if (url.includes("res.cloudinary.com")) {
                try {
                    await fetch(`/api/upload/delete?url=${encodeURIComponent(url)}`, {
                        method: "DELETE",
                    });
                } catch (error) {
                    console.error("Error deleting image from Cloudinary:", error);
                }
            }
        }
    };

    // Initialize previous images on mount
    useEffect(() => {
        if (!isInitializedRef.current && initialContent) {
            try {
                const parsed = JSON.parse(initialContent) as PartialBlock[];
                const urls = extractImageUrls(parsed);
                previousImagesRef.current = urls;
                isInitializedRef.current = true;
            } catch (e) {
                console.error("Failed to parse initial content:", e);
            }
        }
    }, [initialContent]);

    // Debounced block sync function
    const debouncedSyncBlocks = useMemo(() => {
        let timeoutId: NodeJS.Timeout;
        return (docId: Id<"documents">, blocks: Block[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                // Only sync if blocks API is available
                if ((api as any).blocks?.syncBlocks) {
                    syncBlocks({ documentId: docId, blocks })
                        .catch((error) => {
                            console.error("Failed to sync blocks:", error);
                            // Silent fail - document.content is still updated via onChange
                        });
                }
            }, 2000); // 2 second debounce
        };
    }, [syncBlocks]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            // Cancel any pending sync on unmount
        };
    }, []);


    // Helper: Get selected text from editor
    const getSelectedText = (editor: BlockNoteEditor): string => {
        try {
            // Try to get selected blocks first
            const selection = editor.getSelection();

            if (selection && selection.blocks && selection.blocks.length > 0) {
                // Has selection - extract text from selected blocks
                return selection.blocks
                    .map((block: any) => {
                        // Extract text content from block
                        if (typeof block.content === 'string') {
                            return block.content;
                        }
                        if (Array.isArray(block.content)) {
                            return block.content
                                .map((item: any) => item.text || item.content || '')
                                .join('');
                        }
                        return '';
                    })
                    .filter(text => text.trim())
                    .join('\n');
            }

            // No selection - try to get current block or all content
            const cursorPosition = editor.getTextCursorPosition();
            if (cursorPosition && cursorPosition.block) {
                const block: any = cursorPosition.block;
                if (typeof block.content === 'string') {
                    return block.content;
                }
                if (Array.isArray(block.content)) {
                    return block.content
                        .map((item: any) => item.text || item.content || '')
                        .join('');
                }
            }

            // Fallback: get all document text
            const allBlocks = editor.document;
            return allBlocks
                .map((block: any) => {
                    if (typeof block.content === 'string') {
                        return block.content;
                    }
                    if (Array.isArray(block.content)) {
                        return block.content
                            .map((item: any) => item.text || item.content || '')
                            .join('');
                    }
                    return '';
                })
                .filter(text => text.trim())
                .join('\n');

        } catch (error) {
            console.error('Failed to get selected text:', error);
            return '';
        }
    };

    // Helper: Insert generated content into editor
    const insertGeneratedContent = async (editor: BlockNoteEditor, content: string) => {
        try {
            // Try to parse as markdown first
            const blocks = await editor.tryParseMarkdownToBlocks(content);

            if (blocks && blocks.length > 0) {
                // Insert parsed markdown blocks
                editor.insertBlocks(blocks, editor.getTextCursorPosition().block);
                toast.success("Content inserted!");
            } else {
                // Fallback: insert as plain text blocks
                const lines = content.split("\n").filter(line => line.trim());
                const plainBlocks: PartialBlock[] = lines.map(line => ({
                    type: "paragraph" as const,
                    content: line,
                }));

                editor.insertBlocks(plainBlocks, editor.getTextCursorPosition().block);
                toast.success("Content inserted!");
            }
        } catch (error) {
            console.error("Failed to insert content:", error);
            toast.error("Failed to insert content");
        }
    };

    // Helper: Replace selected blocks with generated content
    const replaceSelectedContent = async (editor: BlockNoteEditor, content: string) => {
        try {
            // Get selected blocks
            const selection = editor.getSelection();
            if (!selection || !selection.blocks || selection.blocks.length === 0) {
                // No selection, just insert
                await insertGeneratedContent(editor, content);
                return;
            }

            // Parse new content as markdown
            const newBlocks = await editor.tryParseMarkdownToBlocks(content);

            if (!newBlocks || newBlocks.length === 0) {
                toast.error("Failed to parse generated content");
                return;
            }

            // Remove selected blocks
            const blocksToRemove = selection.blocks;
            editor.removeBlocks(blocksToRemove);

            // Insert new blocks at cursor position
            const cursorPos = editor.getTextCursorPosition();
            editor.insertBlocks(newBlocks, cursorPos.block);

            toast.success("Content replaced!");
        } catch (error) {
            console.error("Failed to replace content:", error);
            toast.error("Failed to replace content");
        }
    };

    // Handle AI generation with preview dialog
    const handleAIGenerate = async (editor: BlockNoteEditor, type: 'expand' | 'improve' | 'continue') => {
        const text = getSelectedText(editor);

        if (!text && type !== 'continue') {
            toast.error("Please select some text first");
            return;
        }

        // Open dialog for preview
        editorRef.current = editor;
        setSelectedText(text);
        setSelectionDialogType(type);
        setShowSelectionDialog(true);
    };

    // AI slash menu items (only outline, template, custom - expand/improve/continue moved to formatting toolbar)
    const getAISlashMenuItems = (editor: BlockNoteEditor) => [
        {
            title: "Create outline-solid",
            onItemClick: () => {
                editorRef.current = editor;
                setShowOutlineDialog(true);
            },
            subtext: "Generate outline-solid from topic",
            group: "AI Assistant",
            aliases: ["ai", "outline-solid", "structure"],
        },
        {
            title: "Insert template",
            onItemClick: () => {
                editorRef.current = editor;
                setShowTemplateDialog(true);
            },
            subtext: "Meeting notes, project plan, etc.",
            group: "AI Assistant",
            aliases: ["ai", "template"],
        },
        {
            title: "Custom prompt",
            onItemClick: () => {
                editorRef.current = editor;
                const text = getSelectedText(editor);
                setSelectedText(text);
                setShowCustomDialog(true);
            },
            subtext: "Generate with your own instructions",
            group: "AI Assistant",
            aliases: ["ai", "custom", "prompt"],
        },
    ];

    // Custom AI Buttons for FormattingToolbar
    const AIExpandButton = () => {
        const Components = useComponentsContext();
        if (!Components) return null;
        return (
            <Components.FormattingToolbar.Button
                label="✨ Expand"
                mainTooltip="Expand selection with AI"
                onClick={() => handleAIGenerate(editor, "expand")}
                isDisabled={isGenerating}
            >
                <Sparkles size={16} />
            </Components.FormattingToolbar.Button>
        );
    };

    const AIImproveButton = () => {
        const Components = useComponentsContext();
        if (!Components) return null;
        return (
            <Components.FormattingToolbar.Button
                label="✏️ Improve"
                mainTooltip="Improve writing with AI"
                onClick={() => handleAIGenerate(editor, "improve")}
                isDisabled={isGenerating}
            >
                <Edit size={16} />
            </Components.FormattingToolbar.Button>
        );
    };

    const AIContinueButton = () => {
        const Components = useComponentsContext();
        if (!Components) return null;
        return (
            <Components.FormattingToolbar.Button
                label="➡️ Continue"
                mainTooltip="Continue writing with AI"
                onClick={() => handleAIGenerate(editor, "continue")}
                isDisabled={isGenerating}
            >
                <ArrowRight size={16} />
            </Components.FormattingToolbar.Button>
        );
    };

    return (
        <>
            <div className="bg-transparent dark:bg-transparent">
                <BlockNoteView
                    editor={editor}
                    editable={editable}
                    theme={resolvedTheme === "dark" ? "dark" : "light"}
                    onChange={() => {
                        const content = JSON.stringify(editor.document, null, 2);

                        // Track images for deletion
                        const currentUrls = extractImageUrls(editor.document);

                        // Only check for deletions after initialization
                        if (isInitializedRef.current) {
                            deleteRemovedImages(currentUrls);
                        } else {
                            isInitializedRef.current = true;
                        }

                        previousImagesRef.current = currentUrls;

                        // Update document.content (hybrid approach)
                        onChange(content);

                        // Sync blocks to database (debounced)
                        if (documentId && editable) {
                            debouncedSyncBlocks(documentId, editor.document);
                        }
                    }}
                    slashMenu={false}
                >
                    <SuggestionMenuController
                        triggerCharacter={"/"}
                        getItems={async (query) => {
                            const defaultItems = getDefaultReactSlashMenuItems(editor);
                            const aiItems = getAISlashMenuItems(editor);
                            const allItems = [...aiItems, ...defaultItems];

                            // Filter based on query
                            if (!query) return allItems;

                            const lowerQuery = query.toLowerCase();
                            return allItems.filter(item =>
                                item.title.toLowerCase().includes(lowerQuery) ||
                                item.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))
                            );
                        }}
                    />
                    <FormattingToolbarController
                        formattingToolbar={() => (
                            <FormattingToolbar>
                                {editable && (
                                    <>
                                        <AIExpandButton />
                                        <AIImproveButton />
                                        <AIContinueButton />
                                    </>
                                )}
                            </FormattingToolbar>
                        )}
                    />
                </BlockNoteView>
            </div>

            {/* AI Generation Dialogs */}
            <OutlineDialog
                isOpen={showOutlineDialog}
                onClose={() => setShowOutlineDialog(false)}
                onInsert={async (content) => {
                    if (editorRef.current) {
                        await insertGeneratedContent(editorRef.current, content);
                    }
                }}
            />
            <TemplateDialog
                isOpen={showTemplateDialog}
                onClose={() => setShowTemplateDialog(false)}
                onInsert={async (content) => {
                    if (editorRef.current) {
                        await insertGeneratedContent(editorRef.current, content);
                    }
                }}
            />
            <CustomPromptDialog
                isOpen={showCustomDialog}
                onClose={() => setShowCustomDialog(false)}
                onInsert={async (content) => {
                    if (editorRef.current) {
                        await insertGeneratedContent(editorRef.current, content);
                    }
                }}
                selectedText={selectedText}
            />
            <SelectionAIDialog
                isOpen={showSelectionDialog}
                onClose={() => {
                    setShowSelectionDialog(false);
                    setSelectionDialogType(null);
                }}
                onInsert={async (content, replace) => {
                    if (editorRef.current) {
                        if (replace) {
                            await replaceSelectedContent(editorRef.current, content);
                        } else {
                            await insertGeneratedContent(editorRef.current, content);
                        }
                    }
                }}
                type={selectionDialogType}
                selectedText={selectedText}
            />
        </>
    );
};
