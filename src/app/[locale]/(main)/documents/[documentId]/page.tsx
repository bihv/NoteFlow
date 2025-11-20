"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { use, useMemo, useEffect } from "react";
import { useTabs } from "@/contexts/tabs-context";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Toolbar } from "./toolbar";
import { Cover } from "./cover";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "@/components/editor-client";

interface DocumentIdPageProps {
    params: Promise<{
        documentId: Id<"documents">;
    }>;
}

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
    const { documentId } = use(params);
    const { addTab, updateTab } = useTabs();

    const document = useQuery(api.documents.getById, {
        documentId: documentId,
    });

    const update = useMutation(api.documents.update);

    // Register document with tab system
    useEffect(() => {
        if (document) {
            addTab({
                id: documentId,
                title: document.title,
                icon: document.icon,
            });
        }
    }, [documentId, addTab]);

    // Update tab when document changes
    useEffect(() => {
        if (document) {
            updateTab(documentId, {
                title: document.title,
                icon: document.icon,
            });
        }
    }, [document?.title, document?.icon, documentId, updateTab]);

    const onChange = (content: string) => {
        update({
            id: documentId,
            content,
        });
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
};

export default DocumentIdPage;
