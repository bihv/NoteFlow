"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItemProps {
    id: string;
    title: string;
    icon?: string;
    isActive: boolean;
    onClick: () => void;
    onClose: (e: React.MouseEvent) => void;
    onMiddleClick?: (e: React.MouseEvent) => void;
}

export function TabItem({
    id,
    title,
    icon,
    isActive,
    onClick,
    onClose,
    onMiddleClick,
}: TabItemProps) {
    const handleMouseDown = (e: React.MouseEvent) => {
        // Middle mouse button
        if (e.button === 1) {
            e.preventDefault();
            onMiddleClick?.(e);
        }
    };

    return (
        <div
            className={cn(
                "tab-item group relative flex items-center gap-2 px-4 py-2.5 min-w-[180px] max-w-[220px] flex-shrink-0 cursor-pointer transition-all duration-200",
                "border-r border-white/10",
                "hover:bg-white/5",
                isActive && "tab-item-active bg-gradient-to-r from-purple-500/10 to-pink-500/10"
            )}
            onClick={onClick}
            onMouseDown={handleMouseDown}
            role="tab"
            aria-selected={isActive}
        >
            {/* Icon */}
            {icon && (
                <span className="text-base flex-shrink-0" aria-hidden="true">
                    {icon}
                </span>
            )}

            {/* Title */}
            <span
                className={cn(
                    "flex-1 truncate text-sm font-medium transition-colors",
                    isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                )}
            >
                {title || "Untitled"}
            </span>

            {/* Close button */}
            <button
                onClick={onClose}
                className={cn(
                    "flex-shrink-0 rounded-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:bg-muted/50",
                    isActive && "opacity-70"
                )}
                aria-label={`Close ${title}`}
            >
                <X className="h-3.5 w-3.5" />
            </button>

            {/* Active indicator */}
            {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
            )}
        </div>
    );
}
