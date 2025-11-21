"use client";

import { X } from "lucide-react";
import { Button } from "./button";

interface TagBadgeProps {
    tag: string;
    onRemove?: () => void;
    variant?: "default" | "primary";
}

export const TagBadge = ({ tag, onRemove, variant = "default" }: TagBadgeProps) => {
    const baseStyles = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md";

    const variantStyles = variant === "primary"
        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border border-purple-400/50 hover:from-purple-600 hover:to-pink-600"
        : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border border-blue-400/50 hover:from-blue-600 hover:to-cyan-600";

    return (
        <span className={`${baseStyles} ${variantStyles}`}>
            <span className="tracking-wide">#{tag}</span>
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors ml-0.5"
                    aria-label="Remove tag"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </span>
    );
};
