"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface SelectionAIButtonProps {
    selectedText: string;
    onClick: () => void;
}

export const SelectionAIButton = ({ selectedText, onClick }: SelectionAIButtonProps) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!selectedText) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                setPosition(null);
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Use getBoundingClientRect directly for viewport-relative positioning
            // This makes the button float properly regardless of scroll position
            setPosition({
                top: rect.top + rect.height / 2, // Vertically centered with selection (viewport relative)
                left: rect.right + 8, // 8px to the right of selection (viewport relative)
            });
        };

        updatePosition();

        // Update position on scroll or resize
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);

        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [selectedText]);

    if (!selectedText || !position) {
        return null;
    }

    return (
        <button
            onClick={onClick}
            className="fixed px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: "translateY(-50%)", // Vertically center the button
                zIndex: 9999,
            }}
        >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI</span>
        </button>
    );
};
