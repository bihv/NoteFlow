"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "@/lib/navigation";
import { useMutation } from "convex/react";
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { useTabs } from "@/contexts/tabs-context";
import { TabItem } from "./tab-item";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TabBar() {
    const router = useRouter();
    const pathname = usePathname();
    const create = useMutation(api.documents.create);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const {
        tabs,
        activeTabId,
        addTab,
        removeTab,
        switchTab,
        maxTabs,
    } = useTabs();

    // Monitor sidebar collapse state via CSS variable
    useEffect(() => {
        const checkSidebarWidth = () => {
            const width = getComputedStyle(document.documentElement)
                .getPropertyValue('--sidebar-width')
                .trim();
            setIsSidebarCollapsed(width === '0px');
        };

        // Initial check
        checkSidebarWidth();

        // Use MutationObserver to watch for style changes
        const observer = new MutationObserver(checkSidebarWidth);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style'],
        });

        return () => observer.disconnect();
    }, []);

    // Sync active tab with current route
    useEffect(() => {
        const match = pathname?.match(/\/documents\/([^\/]+)/);
        if (match && match[1]) {
            const documentId = match[1];
            if (activeTabId !== documentId) {
                switchTab(documentId);
            }
        }
    }, [pathname, activeTabId, switchTab]);

    const handleTabClick = (tabId: string) => {
        // Only navigate - let the useEffect handle the switchTab to avoid double updates
        router.push(`/documents/${tabId}`);
    };

    const handleTabClose = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        removeTab(tabId);

        // If we closed all tabs, redirect to documents page
        if (tabs.length === 1) {
            router.push("/documents");
        }
    };

    const handleNewTab = () => {
        if (tabs.length >= maxTabs) {
            toast.error(`Maximum ${maxTabs} tabs allowed`);
            return;
        }

        const promise = create({ title: "Untitled" }).then((documentId) => {
            addTab({
                id: documentId,
                title: "Untitled",
                icon: undefined,
            });

            // Navigate to new tab
            router.push(`/documents/${documentId}`);
        });

        toast.promise(promise, {
            loading: "Creating a new note...",
            success: "New note created!",
            error: "Failed to create a new note.",
        });
    };

    const scrollTabs = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            const newScrollLeft =
                scrollContainerRef.current.scrollLeft +
                (direction === "left" ? -scrollAmount : scrollAmount);
            scrollContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: "smooth",
            });
        }
    };

    // Prevent scroll from bubbling to parent when scrolling tabs
    const handleWheel = (e: React.WheelEvent) => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const delta = e.deltaY || e.deltaX;

        // Check if we can scroll in the direction being requested
        const canScrollLeft = container.scrollLeft > 0;
        const canScrollRight =
            container.scrollLeft < container.scrollWidth - container.clientWidth;

        // If we can scroll in the requested direction, handle it ourselves
        if ((delta > 0 && canScrollRight) || (delta < 0 && canScrollLeft)) {
            e.preventDefault();
            e.stopPropagation();
            container.scrollLeft += delta;
        }
    };

    return (
        <div
            className="tab-bar border-b border-white/10 bg-secondary/95 backdrop-blur-md"
            style={{
                paddingLeft: isSidebarCollapsed ? '56px' : '0',
            }}
        >
            <div className="flex items-center h-10">
                {tabs.length > 0 && (
                    <>
                        {/* Left scroll button - Fixed */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-full rounded-none px-2 hover:bg-white/5 border-r border-white/5"
                            onClick={() => scrollTabs("left")}
                            aria-label="Scroll tabs left"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Tabs container - Scrollable */}
                        <div
                            ref={scrollContainerRef}
                            className="tab-scroll-container flex-1 min-w-0 flex overflow-x-auto scrollbar-hide"
                            onWheel={handleWheel}
                            style={{
                                scrollbarWidth: "none",
                                msOverflowStyle: "none",
                                WebkitOverflowScrolling: "touch",
                                overscrollBehaviorX: "contain",
                            }}
                        >
                            {tabs.map((tab) => (
                                <TabItem
                                    key={tab.id}
                                    id={tab.id}
                                    title={tab.title}
                                    icon={tab.icon}
                                    isActive={activeTabId === tab.id}
                                    onClick={() => handleTabClick(tab.id)}
                                    onClose={(e) => handleTabClose(e, tab.id)}
                                    onMiddleClick={(e) => handleTabClose(e, tab.id)}
                                />
                            ))}
                        </div>

                        {/* Right scroll button - Fixed */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-full rounded-none px-2 hover:bg-white/5 border-l border-white/5"
                            onClick={() => scrollTabs("right")}
                            aria-label="Scroll tabs right"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </>
                )}

                {/* New tab button - Fixed */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-full rounded-none px-3 hover:bg-white/5 border-l border-white/10"
                    onClick={handleNewTab}
                    aria-label="New tab"
                >
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
