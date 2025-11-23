import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Query: Get all versions for a document (sorted by creation date, newest first)
 */
export const getDocumentVersions = query({
    args: { documentId: v.id("documents") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Verify user owns the document
        const document = await ctx.db.get(args.documentId);
        if (!document) {
            throw new Error("Document not found");
        }
        if (document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        const versions = await ctx.db
            .query("documentVersions")
            .withIndex("by_document_date", (q) =>
                q.eq("documentId", args.documentId)
            )
            .order("desc")
            .collect();

        return versions;
    },
});

/**
 * Query: Get a specific version by ID
 */
export const getVersionById = query({
    args: { versionId: v.id("documentVersions") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const version = await ctx.db.get(args.versionId);
        if (!version) {
            throw new Error("Version not found");
        }

        // Verify user owns the document
        const document = await ctx.db.get(version.documentId);
        if (!document || document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        return version;
    },
});

/**
 * Mutation: Create a new version snapshot
 */
export const createVersion = mutation({
    args: {
        documentId: v.id("documents"),
        changeDescription: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Verify user owns the document
        const document = await ctx.db.get(args.documentId);
        if (!document) {
            throw new Error("Document not found");
        }
        if (document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        // Get current blocks
        const blocks = await ctx.db
            .query("blocks")
            .withIndex("by_document_position", (q) =>
                q.eq("documentId", args.documentId)
            )
            .order("asc")
            .collect();

        // Create snapshot
        const versionId = await ctx.db.insert("documentVersions", {
            documentId: args.documentId,
            userId,
            documentSnapshot: {
                title: document.title,
                icon: document.icon,
                coverImage: document.coverImage,
                tags: document.tags,
            },
            blocksSnapshot: blocks.map((b) => ({
                type: b.type,
                content: b.content,
                props: b.props,
                position: b.position,
            })),
            createdAt: Date.now(),
            changeDescription: args.changeDescription || "Auto-saved version",
        });

        return versionId;
    },
});

/**
 * Mutation: Restore document to a specific version
 */
export const restoreVersion = mutation({
    args: {
        versionId: v.id("documentVersions"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Get the version to restore
        const version = await ctx.db.get(args.versionId);
        if (!version) {
            throw new Error("Version not found");
        }

        // Verify user owns the document
        const document = await ctx.db.get(version.documentId);
        if (!document || document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        // Create a snapshot of current state before restoring (for safety)
        const currentBlocks = await ctx.db
            .query("blocks")
            .withIndex("by_document", (q) => q.eq("documentId", version.documentId))
            .collect();

        await ctx.db.insert("documentVersions", {
            documentId: version.documentId,
            userId,
            documentSnapshot: {
                title: document.title,
                icon: document.icon,
                coverImage: document.coverImage,
                tags: document.tags,
            },
            blocksSnapshot: currentBlocks.map((b) => ({
                type: b.type,
                content: b.content,
                props: b.props,
                position: b.position,
            })),
            createdAt: Date.now(),
            changeDescription: "Before restore checkpoint",
        });

        // Restore document metadata
        await ctx.db.patch(version.documentId, {
            title: version.documentSnapshot.title,
            icon: version.documentSnapshot.icon,
            coverImage: version.documentSnapshot.coverImage,
            tags: version.documentSnapshot.tags,
        });

        // Delete all current blocks
        for (const block of currentBlocks) {
            await ctx.db.delete(block._id);
        }

        // Recreate blocks from snapshot
        for (const blockData of version.blocksSnapshot) {
            await ctx.db.insert("blocks", {
                documentId: version.documentId,
                type: blockData.type,
                content: blockData.content,
                props: blockData.props,
                position: blockData.position,
                lastModifiedBy: userId,
                lastModifiedAt: Date.now(),
                version: 1,
            });
        }

        return version.documentId;
    },
});

/**
 * Mutation: Delete a specific version (optional - for cleanup)
 */
export const deleteVersion = mutation({
    args: { versionId: v.id("documentVersions") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const version = await ctx.db.get(args.versionId);
        if (!version) {
            throw new Error("Version not found");
        }

        // Verify user owns the document
        const document = await ctx.db.get(version.documentId);
        if (!document || document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.versionId);
    },
});
