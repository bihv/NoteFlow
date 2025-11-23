import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Query: Get all blocks for a document (ordered by position)
 */
export const getDocumentBlocks = query({
    args: { documentId: v.id("documents") },
    handler: async (ctx, args) => {
        const blocks = await ctx.db
            .query("blocks")
            .withIndex("by_document_position", (q) =>
                q.eq("documentId", args.documentId)
            )
            .order("asc")
            .collect();

        return blocks;
    },
});

/**
 * Mutation: Create a single block
 */
export const createBlock = mutation({
    args: {
        documentId: v.id("documents"),
        type: v.string(),
        content: v.optional(v.any()),
        props: v.optional(v.any()),
        position: v.number(),
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

        const blockId = await ctx.db.insert("blocks", {
            documentId: args.documentId,
            type: args.type,
            content: args.content,
            props: args.props,
            position: args.position,
            lastModifiedBy: userId,
            lastModifiedAt: Date.now(),
            version: 1,
        });

        return blockId;
    },
});

/**
 * Mutation: Update a block
 */
export const updateBlock = mutation({
    args: {
        blockId: v.id("blocks"),
        type: v.optional(v.string()),
        content: v.optional(v.any()),
        props: v.optional(v.any()),
        position: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const block = await ctx.db.get(args.blockId);
        if (!block) {
            throw new Error("Block not found");
        }

        // Verify user owns the document
        const document = await ctx.db.get(block.documentId);
        if (!document || document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        const { blockId, ...updates } = args;
        const filteredUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        await ctx.db.patch(blockId, {
            ...filteredUpdates,
            lastModifiedBy: userId,
            lastModifiedAt: Date.now(),
            version: (block.version || 1) + 1,
        });

        return blockId;
    },
});

/**
 * Mutation: Delete a block
 */
export const deleteBlock = mutation({
    args: { blockId: v.id("blocks") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const block = await ctx.db.get(args.blockId);
        if (!block) {
            throw new Error("Block not found");
        }

        // Verify user owns the document
        const document = await ctx.db.get(block.documentId);
        if (!document || document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.blockId);
    },
});

/**
 * Mutation: Batch synchronize blocks from editor
 * This is the main function called when the editor content changes.
 * It efficiently syncs the entire document by comparing existing blocks with new ones.
 */
export const syncBlocks = mutation({
    args: {
        documentId: v.id("documents"),
        blocks: v.array(v.any()), // BlockNote blocks array
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

        // Get existing blocks
        const existingBlocks = await ctx.db
            .query("blocks")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .collect();

        // Create a map of existing blocks by position for efficient lookup
        const existingBlocksMap = new Map(
            existingBlocks.map((b, idx) => [idx, b])
        );

        // Process new blocks
        const newBlocksToCreate: any[] = [];
        const blocksToUpdate: Array<{ id: Id<"blocks">; data: any }> = [];
        const processedBlockIds = new Set<Id<"blocks">>();

        for (let i = 0; i < args.blocks.length; i++) {
            const newBlock = args.blocks[i];
            const position = i; // Use simple integer positions for now
            const existingBlock = existingBlocksMap.get(i);

            if (existingBlock) {
                // Update existing block if content changed
                const contentChanged =
                    JSON.stringify(existingBlock.content) !== JSON.stringify(newBlock.content) ||
                    JSON.stringify(existingBlock.props) !== JSON.stringify(newBlock.props) ||
                    existingBlock.type !== newBlock.type ||
                    existingBlock.position !== position;

                if (contentChanged) {
                    blocksToUpdate.push({
                        id: existingBlock._id,
                        data: {
                            type: newBlock.type,
                            content: newBlock.content,
                            props: newBlock.props,
                            position,
                            lastModifiedBy: userId,
                            lastModifiedAt: Date.now(),
                            version: (existingBlock.version || 1) + 1,
                        },
                    });
                }
                processedBlockIds.add(existingBlock._id);
            } else {
                // Create new block
                newBlocksToCreate.push({
                    documentId: args.documentId,
                    type: newBlock.type,
                    content: newBlock.content,
                    props: newBlock.props,
                    position,
                    lastModifiedBy: userId,
                    lastModifiedAt: Date.now(),
                    version: 1,
                });
            }
        }

        // Delete blocks that are no longer in the document
        const blocksToDelete = existingBlocks.filter(
            (b) => !processedBlockIds.has(b._id)
        );

        // Execute all operations
        for (const block of newBlocksToCreate) {
            await ctx.db.insert("blocks", block);
        }

        for (const { id, data } of blocksToUpdate) {
            await ctx.db.patch(id, data);
        }
        for (const block of blocksToDelete) {
            await ctx.db.delete(block._id);
        }

        // NOTE: We no longer update documents.content - using blocks-only storage
        // The content is reconstructed from blocks when loading documents

        return {
            created: newBlocksToCreate.length,
            updated: blocksToUpdate.length,
            deleted: blocksToDelete.length,
        };
    },
});

/**
 * Mutation: Reorder blocks by updating their positions
 */
export const reorderBlocks = mutation({
    args: {
        documentId: v.id("documents"),
        blockPositions: v.array(
            v.object({
                blockId: v.id("blocks"),
                newPosition: v.number(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Verify user owns the document
        const document = await ctx.db.get(args.documentId);
        if (!document || document.userId !== userId) {
            throw new Error("Unauthorized");
        }

        // Update all positions
        for (const { blockId, newPosition } of args.blockPositions) {
            const block = await ctx.db.get(blockId);
            if (block && block.documentId === args.documentId) {
                await ctx.db.patch(blockId, {
                    position: newPosition,
                    lastModifiedBy: userId,
                    lastModifiedAt: Date.now(),
                });
            }
        }
    },
});
