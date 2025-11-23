import { Doc } from "@/convex/_generated/dataModel";

type Block = {
    type: string;
    content?: any;
    props?: any;
};

type DocumentWithBlocks = Doc<"documents"> & {
    blocks?: Block[];
};

export function convertToMarkdown(documents: DocumentWithBlocks[]): string {
    let markdown = `# Nova Export\n\n`;
    markdown += `Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    markdown += `Total Documents: ${documents.length}\n\n`;
    markdown += `---\n\n`;

    // Group documents by parent/child relationship
    const rootDocuments = documents.filter(doc => !doc.parentDocument);
    const childrenMap = new Map<string, DocumentWithBlocks[]>();

    documents.forEach(doc => {
        if (doc.parentDocument) {
            const key = doc.parentDocument;
            if (!childrenMap.has(key)) {
                childrenMap.set(key, []);
            }
            childrenMap.get(key)!.push(doc);
        }
    });

    // Render documents recursively
    const renderDocument = (doc: DocumentWithBlocks, level: number = 0): string => {
        const indent = "  ".repeat(level);
        let md = "";

        // Title with appropriate heading level (max h6)
        const headingLevel = Math.min(level + 1, 6);
        md += `${"#".repeat(headingLevel)} ${doc.icon || "📄"} ${doc.title}\n\n`;

        // Metadata
        md += `${indent}_Created: ${new Date(doc._creationTime).toLocaleString()}_\n`;
        if (doc.isArchived) {
            md += `${indent}**Status:** 🗄️ Archived\n`;
        }
        if (doc.isPublished) {
            md += `${indent}**Status:** 🌐 Published\n`;
        }
        md += `\n`;

        // Content from blocks
        if (doc.blocks && Array.isArray(doc.blocks)) {
            doc.blocks.forEach((block: Block) => {
                if (block.type === "paragraph" && block.content) {
                    const text = Array.isArray(block.content)
                        ? block.content.map((c: any) => c.text || "").join("")
                        : "";
                    if (text) md += `${indent}${text}\n\n`;
                } else if (block.type === "heading" && block.content) {
                    const text = Array.isArray(block.content)
                        ? block.content.map((c: any) => c.text || "").join("")
                        : "";
                    const level = block.props?.level || 1;
                    md += `${indent}${"#".repeat(level + headingLevel)} ${text}\n\n`;
                } else if (block.type === "bulletListItem" && block.content) {
                    const text = Array.isArray(block.content)
                        ? block.content.map((c: any) => c.text || "").join("")
                        : "";
                    md += `${indent}- ${text}\n`;
                } else if (block.type === "numberedListItem" && block.content) {
                    const text = Array.isArray(block.content)
                        ? block.content.map((c: any) => c.text || "").join("")
                        : "";
                    md += `${indent}1. ${text}\n`;
                }
            });
        }

        // Cover image
        if (doc.coverImage) {
            md += `${indent}![Cover Image](${doc.coverImage})\n\n`;
        }

        // Render children
        const children = childrenMap.get(doc._id) || [];
        if (children.length > 0) {
            children.forEach(child => {
                md += renderDocument(child, level + 1);
            });
        }

        md += `\n${indent}---\n\n`;
        return md;
    };

    // Render all root documents
    rootDocuments.forEach(doc => {
        markdown += renderDocument(doc);
    });

    return markdown;
}
