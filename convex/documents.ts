import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const getSidebar = query({
    args: {
        parentDocument: v.optional(v.id("documents")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user_parent", (q) =>
                q.eq("userId", userId).eq("parentDocument", args.parentDocument)
            )
            .filter((q) => q.eq(q.field("isArchived"), false))
            .order("desc")
            .collect();

        return documents;
    },
});

export const create = mutation({
    args: {
        title: v.string(),
        parentDocument: v.optional(v.id("documents")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const document = await ctx.db.insert("documents", {
            title: args.title,
            parentDocument: args.parentDocument,
            userId,
            isArchived: false,
            isPublished: false,
        });

        return document;
    },
});

export const getTrash = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isArchived"), true))
            .order("desc")
            .collect();

        return documents;
    },
});

export const restore = mutation({
    args: { id: v.id("documents") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const existingDocument = await ctx.db.get(args.id);

        if (!existingDocument) {
            throw new Error("Not found");
        }

        if (existingDocument.userId !== userId) {
            throw new Error("Unauthorized");
        }

        const recursiveRestore = async (documentId: Id<"documents">) => {
            const children = await ctx.db
                .query("documents")
                .withIndex("by_user_parent", (q) =>
                    q.eq("userId", userId).eq("parentDocument", documentId)
                )
                .collect();

            for (const child of children) {
                await ctx.db.patch(child._id, {
                    isArchived: false,
                });

                await recursiveRestore(child._id);
            }
        };

        const options: Partial<Doc<"documents">> = {
            isArchived: false,
        };

        if (existingDocument.parentDocument) {
            const parent = await ctx.db.get(existingDocument.parentDocument);
            if (parent?.isArchived) {
                options.parentDocument = undefined;
            }
        }

        const document = await ctx.db.patch(args.id, options);

        recursiveRestore(args.id);

        return document;
    },
});

export const remove = mutation({
    args: { id: v.id("documents") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const existingDocument = await ctx.db.get(args.id);

        if (!existingDocument) {
            throw new Error("Not found");
        }

        if (existingDocument.userId !== userId) {
            throw new Error("Unauthorized");
        }

        // Delete all blocks associated with this document
        const blocks = await ctx.db
            .query("blocks")
            .withIndex("by_document", (q) => q.eq("documentId", args.id))
            .collect();

        for (const block of blocks) {
            await ctx.db.delete(block._id);
        }

        // Delete all comments associated with this document
        const comments = await ctx.db
            .query("comments")
            .withIndex("by_document", (q) => q.eq("documentId", args.id))
            .collect();

        for (const comment of comments) {
            await ctx.db.delete(comment._id);
        }

        // Delete all document versions associated with this document
        const versions = await ctx.db
            .query("documentVersions")
            .withIndex("by_document", (q) => q.eq("documentId", args.id))
            .collect();

        for (const version of versions) {
            await ctx.db.delete(version._id);
        }

        // Delete the document
        const document = await ctx.db.delete(args.id);

        return document;
    },
});

export const getSearch = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isArchived"), false))
            .order("desc")
            .collect();

        return documents;
    },
});

export const getSearchWithBlocks = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isArchived"), false))
            .order("desc")
            .collect();

        // Fetch blocks for each document
        const documentsWithBlocks = await Promise.all(
            documents.map(async (doc) => {
                const blocks = await ctx.db
                    .query("blocks")
                    .withIndex("by_document_position", (q) => q.eq("documentId", doc._id))
                    .order("asc")
                    .collect();

                return {
                    ...doc,
                    blocks,
                };
            })
        );

        return documentsWithBlocks;
    },
});

export const getById = query({
    args: { documentId: v.id("documents") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        const document = await ctx.db.get(args.documentId);

        if (!document) {
            return null; // Return null instead of throwing
        }

        if (document.isPublished && !document.isArchived) {
            return document;
        }

        if (!identity) {
            return null; // Return null instead of throwing
        }

        const userId = identity.subject;

        if (document.userId !== userId) {
            return null; // Return null instead of throwing
        }

        return document;
    },
});

export const update = mutation({
    args: {
        id: v.id("documents"),
        title: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        icon: v.optional(v.string()),
        isPublished: v.optional(v.boolean()),
        tags: v.optional(v.array(v.string())),
        summary: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const { id, ...rest } = args;

        const existingDocument = await ctx.db.get(args.id);

        if (!existingDocument) {
            throw new Error("Not found");
        }

        if (existingDocument.userId !== userId) {
            throw new Error("Unauthorized");
        }

        const document = await ctx.db.patch(args.id, {
            ...rest,
        });

        return document;
    },
});

export const archive = mutation({
    args: { id: v.id("documents") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const existingDocument = await ctx.db.get(args.id);

        if (!existingDocument) {
            throw new Error("Not found");
        }

        if (existingDocument.userId !== userId) {
            throw new Error("Unauthorized");
        }

        const recursiveArchive = async (documentId: Id<"documents">) => {
            const children = await ctx.db
                .query("documents")
                .withIndex("by_user_parent", (q) =>
                    q.eq("userId", userId).eq("parentDocument", documentId)
                )
                .collect();

            for (const child of children) {
                await ctx.db.patch(child._id, {
                    isArchived: true,
                });

                await recursiveArchive(child._id);
            }
        };

        const document = await ctx.db.patch(args.id, {
            isArchived: true,
        });

        recursiveArchive(args.id);

        return document;
    },
});

export const exportActive = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isArchived"), false))
            .order("desc")
            .collect();

        return documents;
    },
});

export const exportActiveWithBlocks = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isArchived"), false))
            .order("desc")
            .collect();

        // Fetch blocks for each document
        const documentsWithBlocks = await Promise.all(
            documents.map(async (doc) => {
                const blocks = await ctx.db
                    .query("blocks")
                    .withIndex("by_document_position", (q) => q.eq("documentId", doc._id))
                    .order("asc")
                    .collect();

                return {
                    ...doc,
                    blocks,
                };
            })
        );

        return documentsWithBlocks;
    },
});

export const exportAll = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        return documents;
    },
});

export const exportAllWithBlocks = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .collect();

        // Fetch blocks for each document
        const documentsWithBlocks = await Promise.all(
            documents.map(async (doc) => {
                const blocks = await ctx.db
                    .query("blocks")
                    .withIndex("by_document_position", (q) => q.eq("documentId", doc._id))
                    .order("asc")
                    .collect();

                return {
                    ...doc,
                    blocks,
                };
            })
        );

        return documentsWithBlocks;
    },
});


export const importDocuments = mutation({
    args: {
        documents: v.array(
            v.object({
                _id: v.optional(v.string()), // Original ID for mapping
                title: v.string(),
                icon: v.optional(v.string()),
                coverImage: v.optional(v.string()),
                parentDocument: v.optional(v.string()), // Original parent ID
                isArchived: v.optional(v.boolean()),
                blocks: v.optional(v.array(v.any())), // Blocks data
                tags: v.optional(v.array(v.string())), // Tags data
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        const oldToNewIdMap = new Map<string, Id<"documents">>();
        const results = { success: 0, failed: 0, skipped: 0 };

        // First pass: Create all documents without parent links
        for (const doc of args.documents) {
            try {
                const existing = await ctx.db
                    .query("documents")
                    .withIndex("by_user", (q) => q.eq("userId", userId))
                    .filter((q) => q.eq(q.field("title"), doc.title))
                    .first();

                if (existing) {
                    results.skipped++;
                    // Still map the old ID to existing ID for parent relationships
                    if (doc._id) {
                        oldToNewIdMap.set(doc._id, existing._id);
                    }
                    continue;
                }

                const newDocId = await ctx.db.insert("documents", {
                    title: doc.title,
                    icon: doc.icon,
                    coverImage: doc.coverImage,
                    userId,
                    isArchived: doc.isArchived || false,
                    isPublished: false,
                    tags: doc.tags,
                    // parentDocument will be set in second pass
                });

                // Create blocks for this document
                if (doc.blocks && Array.isArray(doc.blocks)) {
                    for (let i = 0; i < doc.blocks.length; i++) {
                        const block = doc.blocks[i];
                        try {
                            await ctx.db.insert("blocks", {
                                documentId: newDocId,
                                type: block.type || "paragraph",
                                content: block.content,
                                props: block.props,
                                position: block.position !== undefined ? block.position : i,
                            });
                        } catch (error) {
                            console.error(`Failed to import block for document: ${doc.title}`, error);
                        }
                    }
                }

                // Map old ID to new ID
                if (doc._id) {
                    oldToNewIdMap.set(doc._id, newDocId);
                }

                results.success++;
            } catch (error) {
                console.error(`Failed to import: ${doc.title}`, error);
                results.failed++;
            }
        }

        // Second pass: Update parent relationships
        for (const doc of args.documents) {
            if (doc.parentDocument && doc._id) {
                const newDocId = oldToNewIdMap.get(doc._id);
                const newParentId = oldToNewIdMap.get(doc.parentDocument);

                if (newDocId && newParentId) {
                    try {
                        await ctx.db.patch(newDocId, {
                            parentDocument: newParentId,
                        });
                    } catch (error) {
                        console.error(`Failed to set parent for: ${doc.title}`, error);
                    }
                }
            }
        }

        return results;
    },
});

// Sharing mutations
export const updateSharing = mutation({
    args: {
        id: v.id("documents"),
        shareEnabled: v.boolean(),
        sharePermission: v.optional(v.union(
            v.literal("view"),
            v.literal("comment"),
            v.literal("edit")
        )),
        shareExpiration: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        const document = await ctx.db.get(args.id);

        if (!document) {
            throw new Error("Document not found");
        }

        if (document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        // Generate shareUrl if enabling sharing and it doesn't exist
        let shareUrl = document.shareUrl;
        if (args.shareEnabled && !shareUrl) {
            // Use crypto.randomUUID instead of nanoid (works in Convex)
            shareUrl = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
        }

        await ctx.db.patch(args.id, {
            shareEnabled: args.shareEnabled,
            shareUrl: args.shareEnabled ? shareUrl : undefined,
            sharePermission: args.shareEnabled ? args.sharePermission : undefined,
            shareExpiration: args.shareEnabled ? args.shareExpiration : undefined,
        });

        return shareUrl;
    },
});

export const getSharedDocument = query({
    args: { shareUrl: v.string() },
    handler: async (ctx, args) => {
        const document = await ctx.db
            .query("documents")
            .withIndex("by_share_url", (q) => q.eq("shareUrl", args.shareUrl))
            .first();

        if (!document) {
            return null;
        }

        // Check if sharing is enabled and not expired
        if (!document.shareEnabled) {
            return null;
        }

        if (document.shareExpiration && Date.now() > document.shareExpiration) {
            return null;
        }

        return document;
    },
});

// Comment mutations and queries
export const addComment = mutation({
    args: {
        documentId: v.id("documents"),
        content: v.string(),
        authorId: v.string(),
        authorName: v.string(),
        selectionStart: v.number(),
        selectionEnd: v.number(),
        selectedText: v.string(),
        parentCommentId: v.optional(v.id("comments")),
    },
    handler: async (ctx, args) => {
        const commentId = await ctx.db.insert("comments", {
            documentId: args.documentId,
            content: args.content,
            authorId: args.authorId,
            authorName: args.authorName,
            selectionStart: args.selectionStart,
            selectionEnd: args.selectionEnd,
            selectedText: args.selectedText,
            parentCommentId: args.parentCommentId,
            isResolved: false,
        });

        return commentId;
    },
});

export const getDocumentComments = query({
    args: { documentId: v.id("documents") },
    handler: async (ctx, args) => {
        const comments = await ctx.db
            .query("comments")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .collect();

        return comments;
    },
});

export const resolveComment = mutation({
    args: {
        commentId: v.id("comments"),
        resolvedBy: v.string(),
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);

        if (!comment) {
            throw new Error("Comment not found");
        }

        await ctx.db.patch(args.commentId, {
            isResolved: !comment.isResolved,
            resolvedAt: !comment.isResolved ? Date.now() : undefined,
            resolvedBy: !comment.isResolved ? args.resolvedBy : undefined,
        });

        return !comment.isResolved;
    },
});

export const deleteComment = mutation({
    args: {
        commentId: v.id("comments"),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const comment = await ctx.db.get(args.commentId);

        if (!comment) {
            throw new Error("Comment not found");
        }

        // Only author can delete
        if (comment.authorId !== args.userId) {
            throw new Error("Unauthorized");
        }

        // Also delete all replies
        const replies = await ctx.db
            .query("comments")
            .withIndex("by_parent", (q) => q.eq("parentCommentId", args.commentId))
            .collect();

        for (const reply of replies) {
            await ctx.db.delete(reply._id);
        }

        await ctx.db.delete(args.commentId);
    },
});
