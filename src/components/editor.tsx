"use client";

import { useTheme } from "next-themes";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect, useRef } from "react";

export interface EditorProps {
    onChange: (value: string) => void;
    initialContent?: string;
    editable?: boolean;
}

const Editor = ({ onChange, initialContent, editable }: EditorProps) => {
    const { resolvedTheme } = useTheme();
    const previousImagesRef = useRef<Set<string>>(new Set());
    const isInitializedRef = useRef(false);

    const uploadFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    };

    const editor: BlockNoteEditor = useCreateBlockNote({
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

    return (
        <div>
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

                    onChange(content);
                }}
            />
        </div>
    );
};

export default Editor;
