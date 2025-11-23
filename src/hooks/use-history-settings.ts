"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface HistorySettings {
    historyEnabled: boolean;
    historyDebounceMs: number;
    historyMaxVersions: number;
    historyRetentionDays: number;
    historyShowNotifications: boolean;
}

const DEFAULT_SETTINGS: HistorySettings = {
    historyEnabled: true,
    historyDebounceMs: 30000, // 30 seconds
    historyMaxVersions: 50,
    historyRetentionDays: 90,
    historyShowNotifications: false,
};

const STORAGE_KEY = "nova-history-settings";

// Helper function to get settings from localStorage
function getLocalSettings(): HistorySettings | null {
    if (typeof window === "undefined") {
        return null;
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error("Failed to load history settings from localStorage:", error);
    }
    return null;
}

// Helper function to save settings to localStorage
function saveLocalSettings(settings: HistorySettings) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save history settings to localStorage:", error);
    }
}

export function useHistorySettings() {
    // Fetch settings from Convex
    const convexSettings = useQuery(api.userPreferences.getHistorySettings);
    const updateSettings = useMutation(api.userPreferences.updateHistorySettings);

    // Local state initialized from localStorage or defaults
    const [settings, setSettings] = useState<HistorySettings>(() => {
        const local = getLocalSettings();
        return local || DEFAULT_SETTINGS;
    });

    // Sync with Convex when it loads
    useEffect(() => {
        if (convexSettings) {
            setSettings(convexSettings);
            saveLocalSettings(convexSettings);
        }
    }, [convexSettings]);

    // Update a specific setting
    const updateSetting = useCallback(
        async <K extends keyof HistorySettings>(
            key: K,
            value: HistorySettings[K]
        ) => {
            const newSettings = { ...settings, [key]: value };

            // Optimistically update local state
            setSettings(newSettings);
            saveLocalSettings(newSettings);

            // Save to Convex
            try {
                await updateSettings({ [key]: value });
            } catch (error) {
                console.error("Failed to update history settings:", error);
                // Revert on error
                setSettings(settings);
            }
        },
        [settings, updateSettings]
    );

    return {
        settings,
        updateSetting,
        isLoading: convexSettings === undefined,
    };
}

// Helper function to format debounce time for display
export function formatDebounceTime(ms: number): string {
    const seconds = ms / 1000;
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
        return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
}

// Helper function to get preset retention day labels
export function getRetentionLabel(days: number): string {
    if (days === 7) return "1 week";
    if (days === 30) return "1 month";
    if (days === 90) return "3 months";
    if (days === 180) return "6 months";
    if (days === 365) return "1 year";
    return `${days} days`;
}
