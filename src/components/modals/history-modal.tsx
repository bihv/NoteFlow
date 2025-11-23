"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Clock, RotateCcw, Trash2, FileText, GitCompare, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { diffWords, diffLines, Change } from "diff";

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: Id<"documents">;
    documentTitle: string;
}

export function HistoryModal({
    isOpen,
    onClose,
    documentId,
    documentTitle,
}: HistoryModalProps) {
    const locale = useLocale();
    const dateLocale = locale === "vi" ? vi : enUS;

    const [selectedVersionId, setSelectedVersionId] = useState<Id<"documentVersions"> | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [viewMode, setViewMode] = useState<"preview" | "compare">("preview");

    // Fetch versions
    const versions = useQuery(
        api.documentVersions.getDocumentVersions,
        isOpen ? { documentId } : "skip"
    );

    const selectedVersion = useQuery(
        api.documentVersions.getVersionById,
        selectedVersionId ? { versionId: selectedVersionId } : "skip"
    );

    // Fetch current document and blocks for comparison
    const currentDocument = useQuery(
        api.documents.getById,
        isOpen ? { documentId } : "skip"
    );
    const currentBlocks = useQuery(
        api.blocks.getDocumentBlocks,
        isOpen ? { documentId } : "skip"
    );

    const restoreVersion = useMutation(api.documentVersions.restoreVersion);
    const deleteVersion = useMutation(api.documentVersions.deleteVersion);

    const handleRestore = async (versionId: Id<"documentVersions">) => {
        setIsRestoring(true);
        try {
            await restoreVersion({ versionId });
            toast.success("Document restored successfully!");
            onClose();
            // Reload the page to show restored content
            window.location.reload();
        } catch (error) {
            console.error("Failed to restore version:", error);
            toast.error("Failed to restore version");
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDelete = async (versionId: Id<"documentVersions">) => {
        try {
            await deleteVersion({ versionId });
            toast.success("Version deleted");
            if (selectedVersionId === versionId) {
                setSelectedVersionId(null);
            }
        } catch (error) {
            console.error("Failed to delete version:", error);
            toast.error("Failed to delete version");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Version History
                    </DialogTitle>
                    <DialogDescription>
                        View and restore previous versions of &quot;{documentTitle}&quot;
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex gap-4 min-h-0">
                    {/* Left Panel - Version List */}
                    <div className="w-80 border-r pr-4">
                        <ScrollArea className="h-full">
                            {versions === undefined ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-12 w-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : versions.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>No version history yet</p>
                                    <p className="text-sm mt-1">
                                        Versions are created automatically as you edit
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {versions.map((version) => (
                                        <button
                                            key={version._id}
                                            onClick={() => setSelectedVersionId(version._id)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all ${selectedVersionId === version._id
                                                ? "bg-primary/10 border-primary"
                                                : "hover:bg-muted border-transparent"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {version.documentSnapshot.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatDistanceToNow(version.createdAt, {
                                                            addSuffix: true,
                                                            locale: dateLocale,
                                                        })}
                                                    </p>
                                                    {version.changeDescription && (
                                                        <p className="text-xs text-muted-foreground mt-1 truncate">
                                                            {version.changeDescription}
                                                        </p>
                                                    )}
                                                </div>
                                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right Panel - Version Preview */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {selectedVersion === undefined ? (
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-64" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : selectedVersion ? (
                            <>
                                <div className="border-b pb-4 mb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        {selectedVersion.documentSnapshot.icon && (
                                            <span className="text-4xl">
                                                {selectedVersion.documentSnapshot.icon}
                                            </span>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-semibold truncate">
                                                {selectedVersion.documentSnapshot.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(selectedVersion.createdAt).toLocaleString(
                                                    locale === "vi" ? "vi-VN" : "en-US"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                        <div className="flex gap-1 border rounded-md">
                                            <Button
                                                onClick={() => setViewMode("preview")}
                                                size="sm"
                                                variant={viewMode === "preview" ? "default" : "ghost"}
                                                className="gap-2 rounded-r-none"
                                            >
                                                <Eye className="h-4 w-4" />
                                                Preview
                                            </Button>
                                            <Button
                                                onClick={() => setViewMode("compare")}
                                                size="sm"
                                                variant={viewMode === "compare" ? "default" : "ghost"}
                                                className="gap-2 rounded-l-none"
                                            >
                                                <GitCompare className="h-4 w-4" />
                                                Compare
                                            </Button>
                                        </div>
                                        <Button
                                            onClick={() => handleRestore(selectedVersion._id)}
                                            disabled={isRestoring}
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            {isRestoring ? "Restoring..." : "Restore"}
                                        </Button>
                                        <Button
                                            onClick={() => handleDelete(selectedVersion._id)}
                                            disabled={isRestoring}
                                            size="sm"
                                            variant="ghost"
                                            className="gap-2 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>

                                {/* Content View */}
                                <ScrollArea className="flex-1">
                                    {viewMode === "preview" ? (
                                        <div className="space-y-2 pr-4">
                                            {selectedVersion.blocksSnapshot.length === 0 ? (
                                                <p className="text-muted-foreground text-sm">
                                                    This version has no content
                                                </p>
                                            ) : (
                                                selectedVersion.blocksSnapshot.map((block: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="p-3 rounded bg-muted/30 text-sm"
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-mono text-muted-foreground">
                                                                {block.type}
                                                            </span>
                                                        </div>
                                                        <div className="text-foreground">
                                                            {getBlockText(block)}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    ) : (
                                        <ComparisonView
                                            selectedVersion={selectedVersion}
                                            currentDocument={currentDocument}
                                            currentBlocks={currentBlocks}
                                        />
                                    )}
                                </ScrollArea>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <div className="text-center">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Select a version to preview</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper function to extract text from block
function getBlockText(block: any): string {
    if (typeof block.content === "string") {
        return block.content;
    }
    if (Array.isArray(block.content)) {
        return block.content
            .map((c: any) => (typeof c === "string" ? c : c.text || ""))
            .join("");
    }
    return JSON.stringify(block.content);
}

// Comparison View Component
function ComparisonView({
    selectedVersion,
    currentDocument,
    currentBlocks,
}: {
    selectedVersion: any;
    currentDocument: any;
    currentBlocks: any;
}) {
    if (!currentDocument || !currentBlocks) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
            </div>
        );
    }

    // Compare titles
    const titleDiff = diffWords(
        selectedVersion.documentSnapshot.title,
        currentDocument.title
    );

    // Compare content block by block
    const versionBlocks = selectedVersion.blocksSnapshot;
    const maxBlocks = Math.max(versionBlocks.length, currentBlocks.length);

    return (
        <div className="space-y-6 pr-4">
            {/* Title Comparison */}
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-3 py-2 border-b">
                    <span className="text-xs font-semibold">Title</span>
                </div>
                <div className="grid grid-cols-2 divide-x">
                    <div className="p-3">
                        <div className="text-xs text-muted-foreground mb-1">Selected Version</div>
                        <DiffText changes={titleDiff} side="old" />
                    </div>
                    <div className="p-3">
                        <div className="text-xs text-muted-foreground mb-1">Current Version</div>
                        <DiffText changes={titleDiff} side="new" />
                    </div>
                </div>
            </div>

            {/* Blocks Comparison */}
            <div className="space-y-4">
                {Array.from({ length: maxBlocks }).map((_, idx) => {
                    const versionBlock = versionBlocks[idx];
                    const currentBlock = currentBlocks[idx];

                    if (!versionBlock && !currentBlock) return null;

                    const versionText = versionBlock ? getBlockText(versionBlock) : "";
                    const currentText = currentBlock ? getBlockText(currentBlock) : "";

                    // Skip if both are empty
                    if (!versionText && !currentText) return null;

                    const blockDiff = diffWords(versionText, currentText);

                    return (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                            <div className="bg-muted px-3 py-2 border-b">
                                <span className="text-xs font-semibold">
                                    Block {idx + 1} ({versionBlock?.type || currentBlock?.type || "unknown"})
                                </span>
                            </div>
                            <div className="grid grid-cols-2 divide-x">
                                <div className="p-3">
                                    {versionBlock ? (
                                        <DiffText changes={blockDiff} side="old" />
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic">
                                            (not present)
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    {currentBlock ? (
                                        <DiffText changes={blockDiff} side="new" />
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic">
                                            (deleted)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Component to render diff with highlighting
function DiffText({ changes, side }: { changes: Change[]; side: "old" | "new" }) {
    return (
        <div className="text-sm whitespace-pre-wrap break-words">
            {changes.map((change, idx) => {
                const shouldShow = side === "old" ? !change.added : !change.removed;

                if (!shouldShow) return null;

                return (
                    <span
                        key={idx}
                        className={`${change.added
                                ? "bg-green-500/20 text-green-700 dark:text-green-300"
                                : change.removed
                                    ? "bg-red-500/20 text-red-700 dark:text-red-300 line-through"
                                    : ""
                            }`}
                    >
                        {change.value}
                    </span>
                );
            })}
        </div>
    );
}
