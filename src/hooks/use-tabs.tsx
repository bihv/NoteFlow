"use client";

import { useState, useEffect, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { usePreferences } from "./use-preferences";

export interface Tab {
    id: string; // documentId
    title: string;
    icon?: string;
}

const STORAGE_KEY = "nova-tabs";

export function useTabs() {
    // Get maxTabs from unified preferences
    const { preferences, updatePreference } = usePreferences();
    const maxTabs = preferences.maxTabs;

    // Initialize state from localStorage on client-side
    const [tabs, setTabs] = useState<Tab[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            console.log('[useTabs] Initial load from localStorage:', stored);
            if (stored) {
                const data = JSON.parse(stored);
                console.log('[useTabs] Parsed initial data:', data);
                const loadedTabs = data.tabs || [];

                // Deduplicate tabs by id (keep first occurrence)
                const uniqueTabs = loadedTabs.filter((tab: Tab, index: number, self: Tab[]) =>
                    self.findIndex(t => t.id === tab.id) === index
                );

                if (uniqueTabs.length !== loadedTabs.length) {
                    console.warn('[useTabs] Removed duplicate tabs:', loadedTabs.length - uniqueTabs.length);
                }

                return uniqueTabs;
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
        setTabs((prev) => {
            console.log('[useTabs] Current tabs state:', prev);
            const existingTab = prev.find((t) => t.id === tab.id);

            if (existingTab) {
                // Just activate the existing tab
                console.log('[useTabs] Tab exists, activating:', tab.id);
                setActiveTabId(tab.id);
                return prev; // Don't modify tabs
            }

            // Check if we've hit the max tabs limit
            if (prev.length >= maxTabs) {
                console.log('[useTabs] Max tabs reached:', prev.length, '>=', maxTabs);
                toast.error(
                    `Bạn chỉ có thể mở tối đa ${maxTabs} tab cùng lúc. Vui lòng đóng một tab trước khi mở tab mới.`,
                    {
                        description: "Mẹo: Bạn có thể thay đổi giới hạn tab trong Settings",
                        duration: 5000,
                    }
                );
                return prev; // Don't modify tabs
            }

            console.log('[useTabs] Creating new tab:', tab);
            const updated = [...prev, tab];
            console.log('[useTabs] Updated tabs:', updated);
            setActiveTabId(tab.id);
            return updated;
        });
    }, []); // Removed tabs dependency - use prev from setTabs callback


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
