import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    documents: defineTable({
        title: v.string(),
        userId: v.string(),
        isArchived: v.boolean(),
        parentDocument: v.optional(v.id("documents")),
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
        // Version history
        lastVersionCreatedAt: v.optional(v.number()), // Timestamp of last auto-version creation
    })
        .index("by_user", ["userId"])
        .index("by_user_parent", ["userId", "parentDocument"])
        .index("by_share_url", ["shareUrl"]), // New index for public access

    blocks: defineTable({
        documentId: v.id("documents"),
        type: v.string(), // "paragraph", "heading", "bulletListItem", "image", "codeBlock", etc.
        content: v.optional(v.any()), // BlockNote content (can be string, array of inline content, or object)
        props: v.optional(v.any()), // Block properties (textColor, backgroundColor, textAlignment, level, language, url, etc.)
        position: v.number(), // Fractional index for ordering (0.0, 1.0, 1.5, 2.0, etc.) - allows efficient inserts
        // For future collaboration features
        version: v.optional(v.number()),
        lastModifiedBy: v.optional(v.string()),
        lastModifiedAt: v.optional(v.number()),
    })
        .index("by_document", ["documentId"])
        .index("by_document_position", ["documentId", "position"]), // For efficient ordered queries

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

    documentVersions: defineTable({
        documentId: v.id("documents"),
        userId: v.string(),
        // Snapshot data
        documentSnapshot: v.object({
            title: v.string(),
            icon: v.optional(v.string()),
            coverImage: v.optional(v.string()),
            tags: v.optional(v.array(v.string())),
        }),
        blocksSnapshot: v.array(v.any()), // Array of blocks at this point in time
        // Metadata
        createdAt: v.number(),
        changeDescription: v.optional(v.string()), // Auto-generated or user-provided
    })
        .index("by_document", ["documentId"])
        .index("by_document_date", ["documentId", "createdAt"]),

    userPreferences: defineTable({
        userId: v.string(),
        // History settings
        historyEnabled: v.boolean(),
        historyDebounceMs: v.number(), // 30000 (30s) to 600000 (10min)
        historyMaxVersions: v.number(), // 10 to 100
        historyRetentionDays: v.number(), // 7 to 365
        historyShowNotifications: v.boolean(),
        // Tabs settings (optional for backward compatibility)
        maxTabs: v.optional(v.number()), // 5 to 50
        // Appearance settings (optional for backward compatibility)
        theme: v.optional(v.string()), // "light" | "dark" | "system"
        locale: v.optional(v.string()), // "en" | "vi"
    })
        .index("by_user", ["userId"]),
});
