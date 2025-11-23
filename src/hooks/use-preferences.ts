"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// All user preferences in one place
export interface UserPreferences {
    // History settings
    historyEnabled: boolean;
    historyDebounceMs: number;
    historyMaxVersions: number;
    historyRetentionDays: number;
    historyShowNotifications: boolean;
    // Tabs settings
    maxTabs: number;
    // Appearance settings
    theme: string;
    locale: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
    historyEnabled: true,
    historyDebounceMs: 30000,
    historyMaxVersions: 50,
    historyRetentionDays: 90,
    historyShowNotifications: false,
    maxTabs: 15,
    theme: "system",
    locale: "en",
};

// LocalStorage keys
const STORAGE_KEY = "nova-preferences";

// Helper functions for localStorage
function getLocalPreferences(): UserPreferences | null {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error("Failed to load preferences from localStorage:", error);
    }
    return null;
}

function saveLocalPreferences(preferences: UserPreferences) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
        console.error("Failed to save preferences to localStorage:", error);
    }
}

/**
 * Hook to manage all user preferences with Convex sync
 */
export function usePreferences() {
    // Fetch from Convex
    const convexPreferences = useQuery(api.userPreferences.getUserPreferences);
    const updatePreferences = useMutation(api.userPreferences.updateUserPreferences);

    // Local state (initialized from localStorage or defaults)
    const [preferences, setPreferences] = useState<UserPreferences>(() => {
        const local = getLocalPreferences();
        return local || DEFAULT_PREFERENCES;
    });

    const [isLoading, setIsLoading] = useState(true);

    // Sync with Convex when data arrives
    useEffect(() => {
        if (convexPreferences) {
            // Ensure all fields have values (use defaults for optional fields)
            const fullPreferences: UserPreferences = {
                historyEnabled: convexPreferences.historyEnabled,
                historyDebounceMs: convexPreferences.historyDebounceMs,
                historyMaxVersions: convexPreferences.historyMaxVersions,
                historyRetentionDays: convexPreferences.historyRetentionDays,
                historyShowNotifications: convexPreferences.historyShowNotifications,
                maxTabs: convexPreferences.maxTabs ?? DEFAULT_PREFERENCES.maxTabs,
                theme: convexPreferences.theme ?? DEFAULT_PREFERENCES.theme,
                locale: convexPreferences.locale ?? DEFAULT_PREFERENCES.locale,
            };
            setPreferences(fullPreferences);
            saveLocalPreferences(fullPreferences);
            setIsLoading(false);
        }
    }, [convexPreferences]);

    // Update a specific preference
    const updatePreference = useCallback(
        async <K extends keyof UserPreferences>(
            key: K,
            value: UserPreferences[K]
        ) => {
            const newPreferences = { ...preferences, [key]: value };

            // Optimistic update
            setPreferences(newPreferences);
            saveLocalPreferences(newPreferences);

            // Sync to Convex
            try {
                await updatePreferences({ [key]: value });
            } catch (error) {
                console.error("Failed to update preference:", error);
                // Revert on error
                setPreferences(preferences);
                saveLocalPreferences(preferences);
            }
        },
        [preferences, updatePreferences]
    );

    // Update multiple preferences at once
    const updateMultiple = useCallback(
        async (updates: Partial<UserPreferences>) => {
            const newPreferences = { ...preferences, ...updates };

            // Optimistic update
            setPreferences(newPreferences);
            saveLocalPreferences(newPreferences);

            // Sync to Convex
            try {
                await updatePreferences(updates);
            } catch (error) {
                console.error("Failed to update preferences:", error);
                // Revert on error
                setPreferences(preferences);
                saveLocalPreferences(preferences);
            }
        },
        [preferences, updatePreferences]
    );

    return {
        preferences,
        isLoading,
        updatePreference,
        updateMultiple,
    };
}
