"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useTabs } from "@/contexts/tabs-context";
import { api } from "@/convex/_generated/api";

export function TabKeyboardShortcuts() {
    const router = useRouter();
    const create = useMutation(api.documents.create);
    const { tabs, activeTabId, removeTab, switchTab } = useTabs();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;

            // Cmd/Ctrl + W: Close current tab
            if (modifier && e.key === "w") {
                e.preventDefault();
                if (activeTabId) {
                    removeTab(activeTabId);
                    // If no tabs left, redirect to documents page
                    if (tabs.length <= 1) {
                        router.push("/documents");
                    }
                }
                return;
            }

            // Cmd/Ctrl + T: Create new document in new tab
            if (modifier && e.key === "t") {
                e.preventDefault();
                const promise = create({ title: "Untitled" }).then((documentId) => {
                    router.push(`/documents/${documentId}`);
                });

                toast.promise(promise, {
                    loading: "Creating a new note...",
                    success: "New note created!",
                    error: "Failed to create a new note.",
                });
                return;
            }

            // Cmd/Ctrl + Tab: Switch to next tab
            if (modifier && e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                if (tabs.length > 0 && activeTabId) {
                    const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
                    const nextIndex = (currentIndex + 1) % tabs.length;
                    const nextTab = tabs[nextIndex];
                    switchTab(nextTab.id);
                    router.push(`/documents/${nextTab.id}`);
                }
                return;
            }

            // Cmd/Ctrl + Shift + Tab: Switch to previous tab
            if (modifier && e.key === "Tab" && e.shiftKey) {
                e.preventDefault();
                if (tabs.length > 0 && activeTabId) {
                    const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
                    const prevIndex =
                        currentIndex - 1 < 0 ? tabs.length - 1 : currentIndex - 1;
                    const prevTab = tabs[prevIndex];
                    switchTab(prevTab.id);
                    router.push(`/documents/${prevTab.id}`);
                }
                return;
            }

            // Cmd/Ctrl + [1-9]: Jump to tab by index
            if (modifier && e.key >= "1" && e.key <= "9") {
                e.preventDefault();
                const index = parseInt(e.key) - 1;
                if (index < tabs.length) {
                    const tab = tabs[index];
                    switchTab(tab.id);
                    router.push(`/documents/${tab.id}`);
                }
                return;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [tabs, activeTabId, removeTab, switchTab, router, create]);

    return null; // This is a hooks-only component
}
