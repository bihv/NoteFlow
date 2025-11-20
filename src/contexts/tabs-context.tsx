"use client";

import { createContext, useContext, ReactNode } from "react";
import { useTabs as useTabsHook } from "@/hooks/use-tabs";

interface TabsContextType {
    tabs: ReturnType<typeof useTabsHook>["tabs"];
    activeTabId: ReturnType<typeof useTabsHook>["activeTabId"];
    addTab: ReturnType<typeof useTabsHook>["addTab"];
    removeTab: ReturnType<typeof useTabsHook>["removeTab"];
    switchTab: ReturnType<typeof useTabsHook>["switchTab"];
    updateTab: ReturnType<typeof useTabsHook>["updateTab"];
    reorderTabs: ReturnType<typeof useTabsHook>["reorderTabs"];
    closeAllTabs: ReturnType<typeof useTabsHook>["closeAllTabs"];
    closeOtherTabs: ReturnType<typeof useTabsHook>["closeOtherTabs"];
    maxTabs: ReturnType<typeof useTabsHook>["maxTabs"];
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function TabsProvider({ children }: { children: ReactNode }) {
    const tabsData = useTabsHook();

    return (
        <TabsContext.Provider value={tabsData}>
            {children}
        </TabsContext.Provider>
    );
}

export function useTabs() {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error("useTabs must be used within TabsProvider");
    }
    return context;
}
