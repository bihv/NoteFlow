"use client";

import { useEffect } from "react";
import { usePathname } from "@/lib/navigation";
import { useTabs } from "@/contexts/tabs-context";
import { DocumentContent } from "./document-content";
import { Id } from "@/convex/_generated/dataModel";

export function TabContainer() {
    const pathname = usePathname();
    const { tabs, activeTabId, switchTab, addTab } = useTabs();

    // Sync with URL on mount and when pathname changes
    useEffect(() => {
        const match = pathname?.match(/\/documents\/([^\/]+)/);
        if (match && match[1]) {
            const documentId = match[1] as Id<"documents">;

            // Check if this document is already in tabs
            const existingTab = tabs.find(t => t.id === documentId);

            if (!existingTab) {
                // Add to tabs if not present
                addTab({
                    id: documentId,
                    title: "Loading...",
                    icon: undefined,
                });
            }

            // Switch to this tab only if it's different
            if (activeTabId !== documentId) {
                switchTab(documentId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, activeTabId]); // Removed tabs, addTab, switchTab to prevent circular updates

    // Handle browser back/forward
    useEffect(() => {
        const handlePopState = () => {
            const match = window.location.pathname.match(/\/documents\/([^\/]+)/);
            if (match && match[1]) {
                const documentId = match[1] as Id<"documents">;
                switchTab(documentId);
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [switchTab]);

    if (tabs.length === 0) {
        return null;
    }

    return (
        <div className="h-full w-full">
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    className="h-full w-full overflow-y-auto"
                    style={{
                        display: activeTabId === tab.id ? "block" : "none",
                    }}
                >
                    <DocumentContent documentId={tab.id as Id<"documents">} />
                </div>
            ))}
        </div>
    );
}
