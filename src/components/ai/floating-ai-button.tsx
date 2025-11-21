"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingAIButtonProps {
    onClick: () => void;
}

export const FloatingAIButton = ({ onClick }: FloatingAIButtonProps) => {
    return (
        <Button
            onClick={onClick}
            size="icon"
            className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 hover:scale-110 z-40"
            title="Open AI Assistant (Cmd+Shift+A)"
        >
            <Sparkles className="h-6 w-6 text-white" />
            <span className="sr-only">AI Assistant</span>
        </Button>
    );
};
