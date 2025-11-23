"use client";

import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Loader2, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { convertToMarkdown } from "@/lib/markdown-converter";

type ExportFormat = "json" | "markdown";

export function DataExportSection() {
    const t = useTranslations();
    const [exportingActive, setExportingActive] = useState(false);
    const [exportingAll, setExportingAll] = useState(false);
    const [importing, setImporting] = useState(false);
    const [format, setFormat] = useState<ExportFormat>("json");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const convex = useConvex();

    const downloadFile = (content: string, filename: string, type: string) => {
        try {
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.style.display = "none";

            document.body.appendChild(link);

            setTimeout(() => {
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 100);
            }, 0);
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download file");
        }
    };

    const handleExportActive = async () => {
        setExportingActive(true);
        try {
            const documents = await convex.query(api.documents.exportActive);
            const timestamp = new Date().toISOString().split("T")[0];

            if (format === "json") {
                const json = JSON.stringify(documents, null, 2);
                downloadFile(json, `nova-active-${timestamp}.json`, "application/json");
            } else {
                const markdown = convertToMarkdown(documents);
                downloadFile(markdown, `nova-active-${timestamp}.md`, "text/markdown");
            }

            toast.success(`Exported ${documents.length} active notes as ${format.toUpperCase()}!`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("An error occurred during export");
        } finally {
            setExportingActive(false);
        }
    };

    const handleExportAll = async () => {
        setExportingAll(true);
        try {
            const documents = await convex.query(api.documents.exportAll);
            const timestamp = new Date().toISOString().split("T")[0];

            if (format === "json") {
                const json = JSON.stringify(documents, null, 2);
                downloadFile(json, `nova-all-${timestamp}.json`, "application/json");
            } else {
                const markdown = convertToMarkdown(documents);
                downloadFile(markdown, `nova-all-${timestamp}.md`, "text/markdown");
            }

            toast.success(`Exported ${documents.length} notes as ${format.toUpperCase()}!`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("An error occurred during export");
        } finally {
            setExportingAll(false);
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate data structure
            if (!Array.isArray(data)) {
                throw new Error("Invalid format: expected array of documents");
            }

            // Transform data to match import schema, preserving IDs for parent relationships
            const documents = data.map((doc: any) => ({
                _id: doc._id, // Preserve original ID for parent mapping
                title: doc.title || "Untitled",
                content: doc.content,
                icon: doc.icon,
                coverImage: doc.coverImage,
                parentDocument: doc.parentDocument, // Original parent ID
                isArchived: doc.isArchived || false,
            }));

            const result = await convex.mutation(api.documents.importDocuments, { documents });

            toast.success(
                `Import complete! ${result.success} imported, ${result.skipped} skipped, ${result.failed} failed`
            );

            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import: " + (error as Error).message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-4 border rounded-lg p-6">
            <div>
                <h2 className="text-xl font-semibold">{t('settings.dataExport.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('settings.dataExport.exportDescription')}
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Label className="text-sm">Format:</Label>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setFormat("json")}
                        variant={format === "json" ? "default" : "outline"}
                        size="sm"
                    >
                        JSON
                    </Button>
                    <Button
                        onClick={() => setFormat("markdown")}
                        variant={format === "markdown" ? "default" : "outline"}
                        size="sm"
                    >
                        Markdown
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {/* Export Active Notes */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                        <Label>Export Active Notes</Label>
                        <p className="text-sm text-muted-foreground">
                            Download all your active (non-archived) notes
                        </p>
                    </div>
                    <Button
                        onClick={handleExportActive}
                        disabled={exportingActive || exportingAll || importing}
                        size="sm"
                        variant="outline"
                    >
                        {exportingActive ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </>
                        )}
                    </Button>
                </div>

                {/* Export All Notes */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                        <Label>Export All Notes</Label>
                        <p className="text-sm text-muted-foreground">
                            Download all notes including archived ones
                        </p>
                    </div>
                    <Button
                        onClick={handleExportAll}
                        disabled={exportingActive || exportingAll || importing}
                        size="sm"
                        variant="outline"
                    >
                        {exportingAll ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </>
                        )}
                    </Button>
                </div>

                {/* Import from JSON */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-1">
                        <Label>Import from JSON</Label>
                        <p className="text-sm text-muted-foreground">
                            Restore notes from a JSON backup file
                        </p>
                    </div>
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                            disabled={importing || exportingActive || exportingAll}
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing || exportingActive || exportingAll}
                            size="sm"
                            variant="outline"
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Import
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
