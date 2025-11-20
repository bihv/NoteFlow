"use client";

import { useState, useEffect, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

export interface Tab {
    id: string; // documentId
    title: string;
    icon?: string;
}

interface Settings {
    maxTabs: number;
}

const DEFAULT_MAX_TABS = 15;
const MIN_TABS = 5;
const MAX_TABS_LIMIT = 50;
const STORAGE_KEY = "noteflow-tabs";
const SETTINGS_KEY = "noteflow-settings";

// Helper function to get settings from localStorage
function getSettings(): Settings {
    if (typeof window === 'undefined') {
        return { maxTabs: DEFAULT_MAX_TABS };
    }
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const settings = JSON.parse(stored);
            return {
                maxTabs: settings.maxTabs || DEFAULT_MAX_TABS
            };
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
    }
    return { maxTabs: DEFAULT_MAX_TABS };
}

// Helper function to save settings to localStorage
function saveSettings(settings: Settings) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings to localStorage:", error);
    }
}

export function updateMaxTabsSetting(maxTabs: number) {
    const clampedValue = Math.max(MIN_TABS, Math.min(MAX_TABS_LIMIT, maxTabs));
    saveSettings({ maxTabs: clampedValue });
    // Dispatch custom event to notify useTabs hook
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('noteflow-settings-changed'));
    }
}

export function useTabs() {
    // Track max tabs setting
    const [maxTabs, setMaxTabs] = useState<number>(() => {
        return getSettings().maxTabs;
    });

    // Listen for settings changes
    useEffect(() => {
        const handleSettingsChange = () => {
            const settings = getSettings();
            setMaxTabs(settings.maxTabs);
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('noteflow-settings-changed', handleSettingsChange);
            return () => {
                window.removeEventListener('noteflow-settings-changed', handleSettingsChange);
            };
        }
    }, []);

    // Initialize state from localStorage on client-side
    const [tabs, setTabs] = useState<Tab[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            console.log('[useTabs] Initial load from localStorage:', stored);
            if (stored) {
                const data = JSON.parse(stored);
                console.log('[useTabs] Parsed initial data:', data);
                return data.tabs || [];
            }
        } catch (error) {
            console.error("Failed to load tabs from localStorage:", error);
        }
        return [];
    });

    const [activeTabId, setActiveTabId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                return data.activeTabId || null;
            }
        } catch (error) {
            console.error("Failed to load activeTabId from localStorage:", error);
        }
        return null;
    });

    // Save tabs to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ tabs, activeTabId })
            );
        } catch (error) {
            console.error("Failed to save tabs to localStorage:", error);
        }
    }, [tabs, activeTabId]);

    const addTab = useCallback((tab: Tab) => {
        console.log('[useTabs] addTab called with:', tab);
        console.log('[useTabs] Current tabs state:', tabs);
        const existingTab = tabs.find((t) => t.id === tab.id);

        if (existingTab) {
            // Just activate the existing tab
            console.log('[useTabs] Tab exists, activating:', tab.id);
            setActiveTabId(tab.id);
        } else {
            // Check if we've hit the max tabs limit
            const currentMaxTabs = getSettings().maxTabs;
            if (tabs.length >= currentMaxTabs) {
                console.log('[useTabs] Max tabs reached:', tabs.length, '>=', currentMaxTabs);
                toast.error(
                    `Bạn chỉ có thể mở tối đa ${currentMaxTabs} tab cùng lúc. Vui lòng đóng một tab trước khi mở tab mới.`,
                    {
                        description: "Mẹo: Bạn có thể thay đổi giới hạn tab trong Settings",
                        duration: 5000,
                    }
                );
                return;
            }

            console.log('[useTabs] Creating new tab:', tab);
            setTabs((prev) => {
                const updated = [...prev, tab];
                console.log('[useTabs] Updated tabs:', updated);
                return updated;
            });
            setActiveTabId(tab.id);
        }
    }, [tabs]);


    const removeTab = useCallback((tabId: string) => {
        setTabs((prevTabs) => {
            const tabIndex = prevTabs.findIndex((t) => t.id === tabId);
            if (tabIndex === -1) return prevTabs;

            const newTabs = prevTabs.filter((t) => t.id !== tabId);

            // If we're closing the active tab, activate another one
            setActiveTabId((prevActiveId) => {
                if (prevActiveId === tabId) {
                    // Activate the next tab, or previous if this was the last one
                    if (newTabs.length > 0) {
                        const nextIndex = Math.min(tabIndex, newTabs.length - 1);
                        return newTabs[nextIndex].id;
                    }
                    return null;
                }
                return prevActiveId;
            });

            return newTabs;
        });
    }, []);

    const switchTab = useCallback((tabId: string) => {
        setTabs((prevTabs) => {
            // Check if tab exists
            const tabExists = prevTabs.some((t) => t.id === tabId);
            if (tabExists) {
                setActiveTabId(tabId);
            }
            return prevTabs;
        });
    }, []);

    const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
        setTabs((prevTabs) =>
            prevTabs.map((tab) =>
                tab.id === tabId ? { ...tab, ...updates } : tab
            )
        );
    }, []);

    const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
        setTabs((prevTabs) => {
            const newTabs = [...prevTabs];
            const [movedTab] = newTabs.splice(fromIndex, 1);
            newTabs.splice(toIndex, 0, movedTab);
            return newTabs;
        });
    }, []);

    const closeAllTabs = useCallback(() => {
        setTabs([]);
        setActiveTabId(null);
    }, []);

    const closeOtherTabs = useCallback((tabId: string) => {
        setTabs((prevTabs) => {
            const tab = prevTabs.find((t) => t.id === tabId);
            return tab ? [tab] : prevTabs;
        });
        setActiveTabId(tabId);
    }, []);

    return {
        tabs,
        activeTabId,
        addTab,
        removeTab,
        switchTab,
        updateTab,
        reorderTabs,
        closeAllTabs,
        closeOtherTabs,
        maxTabs,
    };

}
