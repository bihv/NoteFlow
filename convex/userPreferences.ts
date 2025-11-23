import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default settings
const DEFAULT_HISTORY_SETTINGS = {
    historyEnabled: true,
    historyDebounceMs: 30000, // 30 seconds
    historyMaxVersions: 50,
    historyRetentionDays: 90,
    historyShowNotifications: false,
};

/**
 * Query: Get user's history settings
 */
export const getHistorySettings = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Try to get existing preferences
        const preferences = await ctx.db
            .query("userPreferences")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (preferences) {
            return {
                historyEnabled: preferences.historyEnabled,
                historyDebounceMs: preferences.historyDebounceMs,
                historyMaxVersions: preferences.historyMaxVersions,
                historyRetentionDays: preferences.historyRetentionDays,
                historyShowNotifications: preferences.historyShowNotifications,
            };
        }

        // Return defaults if no preferences exist
        return DEFAULT_HISTORY_SETTINGS;
    },
});

/**
 * Mutation: Update user's history settings
 */
export const updateHistorySettings = mutation({
    args: {
        historyEnabled: v.optional(v.boolean()),
        historyDebounceMs: v.optional(v.number()),
        historyMaxVersions: v.optional(v.number()),
        historyRetentionDays: v.optional(v.number()),
        historyShowNotifications: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Validate ranges
        if (args.historyDebounceMs !== undefined) {
            const validValues = [30000, 60000, 120000, 300000, 600000];
            if (!validValues.includes(args.historyDebounceMs)) {
                throw new Error("Invalid debounce time. Must be one of: 30s, 1m, 2m, 5m, 10m");
            }
        }

        if (args.historyMaxVersions !== undefined) {
            const validValues = [10, 20, 30, 50, 75, 100];
            if (!validValues.includes(args.historyMaxVersions)) {
                throw new Error("Invalid max versions. Must be one of: 10, 20, 30, 50, 75, 100");
            }
        }

        if (args.historyRetentionDays !== undefined) {
            const validValues = [7, 14, 30, 60, 90, 180, 365];
            if (!validValues.includes(args.historyRetentionDays)) {
                throw new Error("Invalid retention days. Must be one of: 7, 14, 30, 60, 90, 180, 365");
            }
        }

        // Get existing preferences
        const existing = await ctx.db
            .query("userPreferences")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const updates = {
            historyEnabled: args.historyEnabled ?? existing?.historyEnabled ?? DEFAULT_HISTORY_SETTINGS.historyEnabled,
            historyDebounceMs: args.historyDebounceMs ?? existing?.historyDebounceMs ?? DEFAULT_HISTORY_SETTINGS.historyDebounceMs,
            historyMaxVersions: args.historyMaxVersions ?? existing?.historyMaxVersions ?? DEFAULT_HISTORY_SETTINGS.historyMaxVersions,
            historyRetentionDays: args.historyRetentionDays ?? existing?.historyRetentionDays ?? DEFAULT_HISTORY_SETTINGS.historyRetentionDays,
            historyShowNotifications: args.historyShowNotifications ?? existing?.historyShowNotifications ?? DEFAULT_HISTORY_SETTINGS.historyShowNotifications,
        };

        if (existing) {
            // Update existing preferences
            await ctx.db.patch(existing._id, updates);
            return existing._id;
        } else {
            // Create new preferences
            const preferencesId = await ctx.db.insert("userPreferences", {
                userId,
                ...updates,
            });
            return preferencesId;
        }
    },
});

/**
 * Mutation: Cleanup old versions based on retention settings
 */
export const cleanupOldVersions = mutation({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Get user's retention settings
        const preferences = await ctx.db
            .query("userPreferences")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const retentionDays = preferences?.historyRetentionDays ?? DEFAULT_HISTORY_SETTINGS.historyRetentionDays;
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

        // Get all versions for the document
        const versions = await ctx.db
            .query("documentVersions")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .collect();

        // Delete versions older than retention period
        let deletedCount = 0;
        for (const version of versions) {
            if (version.createdAt < cutoffTime) {
                await ctx.db.delete(version._id);
                deletedCount++;
            }
        }

        return { deletedCount };
    },
});

/**
 * Mutation: Enforce max versions limit
 */
export const enforceMaxVersions = mutation({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Get user's max versions setting
        const preferences = await ctx.db
            .query("userPreferences")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const maxVersions = preferences?.historyMaxVersions ?? DEFAULT_HISTORY_SETTINGS.historyMaxVersions;

        // Get all versions for the document, sorted by date (newest first)
        const versions = await ctx.db
            .query("documentVersions")
            .withIndex("by_document_date", (q) => q.eq("documentId", args.documentId))
            .order("desc")
            .collect();

        // Delete versions beyond the limit
        let deletedCount = 0;
        if (versions.length > maxVersions) {
            const versionsToDelete = versions.slice(maxVersions);
            for (const version of versionsToDelete) {
                await ctx.db.delete(version._id);
                deletedCount++;
            }
        }

        return { deletedCount };
    },
});
