"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { ElementRef, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { ChevronsLeft, MenuIcon, Search, Settings, Trash, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { UserItem } from "./user-item";
import { DocumentList } from "./document-list";

import { TrashModal, useTrashModal } from "../documents/trash-modal";

export const Navigation = () => {
    const pathname = usePathname();
    const params = useParams();
    const router = useRouter();
    const isMobile = useMediaQuery("(max-width: 768px)");
    const create = useMutation(api.documents.create);
    const { isOpen, onOpen, onClose } = useTrashModal();

    const isResizingRef = useRef(false);
    const sidebarRef = useRef<ElementRef<"aside">>(null);
    const navbarRef = useRef<ElementRef<"div">>(null);
    const [isResetting, setIsResetting] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(isMobile);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isMobile) {
            collapse();
        } else {
            resetWidth();
        }
    }, [isMobile]);

    useEffect(() => {
        if (isMobile) {
            collapse();
        }
    }, [pathname, isMobile]);

    // Initialize sidebar width CSS variable
    useEffect(() => {
        document.documentElement.style.setProperty("--sidebar-width", isMobile ? "0px" : "240px");
    }, [isMobile]);

    // Keyboard shortcut for search (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === "Escape" && searchQuery) {
                setSearchQuery("");
                searchInputRef.current?.blur();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [searchQuery]);

    // Helper function to extract plain text from Block Editor JSON
    const getPlainTextFromContent = (content: string | undefined): string => {
        if (!content) return "";

        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                // Extract text from BlockNote blocks
                return parsed
                    .map((block: any) => {
                        if (block.content && Array.isArray(block.content)) {
                            return block.content
                                .map((item: any) => item.text || "")
                                .join("");
                        }
                        return "";
                    })
                    .filter((text: string) => text.length > 0)
                    .join(" ");
            }
            return "";
        } catch {
            // If not JSON, return as is
            return content;
        }
    };

    // Fetch all documents for search
    const searchDocuments = useQuery(api.documents.getSearch);

    // Filter documents based on search query
    const filteredDocuments = searchQuery && searchDocuments
        ? searchDocuments.filter((doc) => {
            const query = searchQuery.toLowerCase();
            return (
                doc.title.toLowerCase().includes(query) ||
                doc.content?.toLowerCase().includes(query)
            );
        })
        : [];

    const handleMouseDown = (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => {
        event.preventDefault();
        event.stopPropagation();

        isResizingRef.current = true;
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (!isResizingRef.current) return;
        let newWidth = event.clientX;

        if (newWidth < 240) newWidth = 240;
        if (newWidth > 480) newWidth = 480;

        if (sidebarRef.current && navbarRef.current) {
            sidebarRef.current.style.width = `${newWidth}px`;
            navbarRef.current.style.setProperty("left", `${newWidth}px`);
            navbarRef.current.style.setProperty(
                "width",
                `calc(100% - ${newWidth}px)`
            );
            // Update main content margin
            document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`);
        }
    };

    const handleMouseUp = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };

    const resetWidth = () => {
        if (sidebarRef.current && navbarRef.current) {
            setIsCollapsed(false);
            setIsResetting(true);

            sidebarRef.current.style.width = isMobile ? "100%" : "240px";
            navbarRef.current.style.setProperty(
                "width",
                isMobile ? "0" : "calc(100% - 240px)"
            );
            navbarRef.current.style.setProperty("left", isMobile ? "100%" : "240px");
            // Update main content margin
            document.documentElement.style.setProperty("--sidebar-width", isMobile ? "0px" : "240px");
            setTimeout(() => setIsResetting(false), 300);
        }
    };

    const collapse = () => {
        if (sidebarRef.current && navbarRef.current) {
            setIsCollapsed(true);
            setIsResetting(true);

            sidebarRef.current.style.width = "0";
            navbarRef.current.style.setProperty("width", "100%");
            navbarRef.current.style.setProperty("left", "0");
            // Update main content margin to 0 when collapsed
            document.documentElement.style.setProperty("--sidebar-width", "0px");
            setTimeout(() => setIsResetting(false), 300);
        }
    };

    return (
        <>
            <aside
                ref={sidebarRef}
                className={cn(
                    "group/sidebar fixed left-0 top-0 h-screen sidebar-glass sidebar-scrollbar overflow-y-auto flex w-60 flex-col z-[999] border-r border-border/50 shadow-2xl",
                    isResetting && "transition-all ease-in-out duration-300",
                    isMobile && "w-0"
                )}
            >
                <div
                    onClick={collapse}
                    role="button"
                    className={cn(
                        "h-6 w-6 text-muted-foreground rounded-md hover:bg-accent/50 absolute top-3 right-2 opacity-0 group-hover/sidebar:opacity-100 transition-all duration-200 flex items-center justify-center",
                        isMobile && "opacity-100"
                    )}
                >
                    <ChevronsLeft className="h-6 w-6" />
                </div>
                <div className="space-y-4 py-4">
                    <UserItem />

                    {/* Search - Full width row */}
                    <div className="px-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search (Ctrl+K)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-9 py-2 text-sm bg-accent/30 hover:bg-accent/50 focus:bg-accent/50 border-none rounded-md text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 notion-focus"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search Results or Document List */}
                    <div className="px-1">
                        {searchQuery ? (
                            <div className="space-y-1">
                                {filteredDocuments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No documents found
                                    </p>
                                ) : (
                                    filteredDocuments.map((doc) => (
                                        <div
                                            key={doc._id}
                                            onClick={() => router.push(`/${params.locale}/documents/${doc._id}`)}
                                            role="button"
                                            className="text-sm p-2 hover:bg-accent/50 flex items-start w-full rounded-md transition-all duration-200 nav-item-hover cursor-pointer"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-foreground truncate">
                                                    {doc.icon && <span className="mr-2">{doc.icon}</span>}
                                                    {doc.title}
                                                </div>
                                                {(() => {
                                                    const plainText = getPlainTextFromContent(doc.content);
                                                    return plainText ? (
                                                        <div className="text-xs text-muted-foreground truncate mt-1">
                                                            {plainText.substring(0, 80)}...
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <DocumentList />
                        )}
                    </div>

                    {/* Settings - Full width row */}
                    <div className="px-1">
                        <div
                            onClick={() => router.push("/settings")}
                            role="button"
                            className="text-sm p-2 hover:bg-accent/50 flex items-center w-full rounded-md text-muted-foreground transition-all duration-200 nav-item-hover"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            <span className="text-xs">Settings</span>
                        </div>
                    </div>

                    {/* Trash */}
                    <div className="px-1">
                        <div
                            onClick={onOpen}
                            role="button"
                            className="text-sm p-2 hover:bg-accent/50 flex items-center w-full rounded-md text-muted-foreground transition-all duration-200 nav-item-hover"
                        >
                            <Trash className="h-4 w-4 mr-2" />
                            <span className="text-xs">Trash</span>
                        </div>
                    </div>


                </div>
                <div
                    onMouseDown={handleMouseDown}
                    onClick={resetWidth}
                    className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 cursor-ew-resize absolute h-full w-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent hover:via-primary/40 right-0 top-0"
                />
            </aside>
            <div
                ref={navbarRef}
                className={cn(
                    "absolute top-0 z-[99999] left-60 w-[calc(100%-240px)]",
                    isResetting && "transition-all ease-in-out duration-300",
                    isMobile && "left-0 w-full"
                )}
            >
                {!!params.documentId && (
                    <nav className="bg-transparent px-3 py-2 w-full">
                        {isCollapsed && (
                            <MenuIcon
                                onClick={resetWidth}
                                role="button"
                                className="h-6 w-6 text-muted-foreground"
                            />
                        )}
                    </nav>
                )}
            </div>
            <TrashModal isOpen={isOpen} onClose={onClose} />
        </>
    );
};
