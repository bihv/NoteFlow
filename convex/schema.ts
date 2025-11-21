import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    documents: defineTable({
        title: v.string(),
        userId: v.string(),
        isArchived: v.boolean(),
        parentDocument: v.optional(v.id("documents")),
        content: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        icon: v.optional(v.string()),
        isPublished: v.boolean(),
        publishedUrl: v.optional(v.string()),
        // Sharing fields
        shareEnabled: v.optional(v.boolean()),
        shareUrl: v.optional(v.string()),
        sharePermission: v.optional(
            v.union(v.literal("view"), v.literal("comment"), v.literal("edit"))
        ),
        shareExpiration: v.optional(v.number()), // Timestamp
        // AI-related fields
        tags: v.optional(v.array(v.string())),
        summary: v.optional(v.string()),
        aiMetadata: v.optional(v.any()), // For extensibility (last generation time, etc.)
    })
        .index("by_user", ["userId"])
        .index("by_user_parent", ["userId", "parentDocument"])
        .index("by_share_url", ["shareUrl"]), // New index for public access

    comments: defineTable({
        documentId: v.id("documents"),
        content: v.string(),
        authorId: v.string(),
        authorName: v.string(),
        // Text selection metadata
        selectionStart: v.number(),
        selectionEnd: v.number(),
        selectedText: v.string(),
        // Thread support
        parentCommentId: v.optional(v.id("comments")),
        // Resolution
        isResolved: v.boolean(),
        resolvedAt: v.optional(v.number()),
        resolvedBy: v.optional(v.string()),
    })
        .index("by_document", ["documentId"])
        .index("by_parent", ["parentCommentId"]),
});
