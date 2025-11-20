"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useCallback, memo } from "react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Toolbar } from "@/app/[locale]/(main)/documents/[documentId]/toolbar";
import { Cover } from "@/app/[locale]/(main)/documents/[documentId]/cover";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "@/components/editor-client";
import { useTabs } from "@/contexts/tabs-context";

interface DocumentContentProps {
    documentId: Id<"documents">;
}

function DocumentContentComponent({ documentId }: DocumentContentProps) {
    const { updateTab } = useTabs();
    const prevDocumentRef = useRef<{ title: string; icon?: string } | null>(null);

    const document = useQuery(api.documents.getById, {
        documentId: documentId,
    });

    const update = useMutation(api.documents.update);

    // Update tab when document data changes (but avoid redundant updates)
    useEffect(() => {
        if (document) {
            const current = { title: document.title, icon: document.icon };
            const prev = prevDocumentRef.current;

            // Only update if values actually changed
            if (!prev || prev.title !== current.title || prev.icon !== current.icon) {
                updateTab(documentId, current);
                prevDocumentRef.current = current;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [document?.title, document?.icon, documentId]);

    const onChange = useCallback((content: string) => {
        update({
            id: documentId,
            content,
        });
    }, [documentId, update]);

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
        return <div>Not found</div>;
    }

    return (
        <div className="pb-40">
            <Cover url={document.coverImage} />
            <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
                <Toolbar initialData={document} />
                <Editor
                    onChange={onChange}
                    initialContent={document.content}
                    editable={true}
                />
            </div>
        </div>
    );
}

// Memoize to prevent unnecessary re-renders when switching tabs
export const DocumentContent = memo(DocumentContentComponent);
