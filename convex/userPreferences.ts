import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default settings
const DEFAULT_SETTINGS = {
    // History
    historyEnabled: true,
    historyDebounceMs: 30000, // 30 seconds
    historyMaxVersions: 50,
    historyRetentionDays: 90,
    historyShowNotifications: false,
    // Tabs
    maxTabs: 15,
    // Appearance
    theme: "system" as const,
    locale: "en" as const,
};

/**
 * Query: Get user's all preferences
 */
export const getUserPreferences = query({
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
                maxTabs: preferences.maxTabs,
                theme: preferences.theme,
                locale: preferences.locale,
            };
        }

        // Return defaults if no preferences exist
        return DEFAULT_SETTINGS;
    },
});

/**
 * Query: Get user's history settings (backward compatibility)
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
        return {
            historyEnabled: DEFAULT_SETTINGS.historyEnabled,
            historyDebounceMs: DEFAULT_SETTINGS.historyDebounceMs,
            historyMaxVersions: DEFAULT_SETTINGS.historyMaxVersions,
            historyRetentionDays: DEFAULT_SETTINGS.historyRetentionDays,
            historyShowNotifications: DEFAULT_SETTINGS.historyShowNotifications,
        };
    },
});

/**
 * Mutation: Update user's preferences (all settings)
 */
export const updateUserPreferences = mutation({
    args: {
        // History settings
        historyEnabled: v.optional(v.boolean()),
        historyDebounceMs: v.optional(v.number()),
        historyMaxVersions: v.optional(v.number()),
        historyRetentionDays: v.optional(v.number()),
        historyShowNotifications: v.optional(v.boolean()),
        // Tabs settings
        maxTabs: v.optional(v.number()),
        // Appearance settings
        theme: v.optional(v.string()),
        locale: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Validate history settings
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

        // Validate tabs settings
        if (args.maxTabs !== undefined) {
            const validValues = [5, 10, 15, 20, 25, 30, 40, 50];
            if (!validValues.includes(args.maxTabs)) {
                throw new Error("Invalid max tabs. Must be one of: 5, 10, 15, 20, 25, 30, 40, 50");
            }
        }

        // Validate appearance settings
        if (args.theme !== undefined) {
            const validThemes = ["light", "dark", "system"];
            if (!validThemes.includes(args.theme)) {
                throw new Error("Invalid theme. Must be one of: light, dark, system");
            }
        }

        if (args.locale !== undefined) {
            const validLocales = ["en", "vi"];
            if (!validLocales.includes(args.locale)) {
                throw new Error("Invalid locale. Must be one of: en, vi");
            }
        }

        // Get existing preferences
        const existing = await ctx.db
            .query("userPreferences")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        const updates = {
            historyEnabled: args.historyEnabled ?? existing?.historyEnabled ?? DEFAULT_SETTINGS.historyEnabled,
            historyDebounceMs: args.historyDebounceMs ?? existing?.historyDebounceMs ?? DEFAULT_SETTINGS.historyDebounceMs,
            historyMaxVersions: args.historyMaxVersions ?? existing?.historyMaxVersions ?? DEFAULT_SETTINGS.historyMaxVersions,
            historyRetentionDays: args.historyRetentionDays ?? existing?.historyRetentionDays ?? DEFAULT_SETTINGS.historyRetentionDays,
            historyShowNotifications: args.historyShowNotifications ?? existing?.historyShowNotifications ?? DEFAULT_SETTINGS.historyShowNotifications,
            maxTabs: args.maxTabs ?? existing?.maxTabs ?? DEFAULT_SETTINGS.maxTabs,
            theme: args.theme ?? existing?.theme ?? DEFAULT_SETTINGS.theme,
            locale: args.locale ?? existing?.locale ?? DEFAULT_SETTINGS.locale,
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
 * Mutation: Update history settings only (backward compatibility)
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
            historyEnabled: args.historyEnabled ?? existing?.historyEnabled ?? DEFAULT_SETTINGS.historyEnabled,
            historyDebounceMs: args.historyDebounceMs ?? existing?.historyDebounceMs ?? DEFAULT_SETTINGS.historyDebounceMs,
            historyMaxVersions: args.historyMaxVersions ?? existing?.historyMaxVersions ?? DEFAULT_SETTINGS.historyMaxVersions,
            historyRetentionDays: args.historyRetentionDays ?? existing?.historyRetentionDays ?? DEFAULT_SETTINGS.historyRetentionDays,
            historyShowNotifications: args.historyShowNotifications ?? existing?.historyShowNotifications ?? DEFAULT_SETTINGS.historyShowNotifications,
        };

        if (existing) {
            // Update existing preferences
            await ctx.db.patch(existing._id, updates);
            return existing._id;
        } else {
            // Create new preferences with defaults for other fields
            const preferencesId = await ctx.db.insert("userPreferences", {
                userId,
                ...updates,
                maxTabs: DEFAULT_SETTINGS.maxTabs,
                theme: DEFAULT_SETTINGS.theme,
                locale: DEFAULT_SETTINGS.locale,
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

        const retentionDays = preferences?.historyRetentionDays ?? DEFAULT_SETTINGS.historyRetentionDays;
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

        const maxVersions = preferences?.historyMaxVersions ?? DEFAULT_SETTINGS.historyMaxVersions;

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
