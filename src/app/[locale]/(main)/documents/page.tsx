"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { PlusCircle, Sparkles, Zap, Users } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

const DocumentsPage = () => {
    const router = useRouter();
    const { user } = useUser();
    const create = useMutation(api.documents.create);

    const onCreate = () => {
        const promise = create({ title: "Untitled" }).then((documentId) => {
            router.push(`/documents/${documentId}`);
        });

        toast.promise(promise, {
            loading: "Creating a new note...",
            success: "New note created!",
            error: "Failed to create a new note.",
        });
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden gradient-bg">
            {/* Floating blob decorations */}
            <div className="floating-blob floating-blob-1" />
            <div className="floating-blob floating-blob-2" />
            <div className="floating-blob floating-blob-3" />

            {/* Main content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
                {/* Hero section with glassmorphism card */}
                <div className="glass-card rounded-3xl p-8 md:p-12 max-w-3xl w-full space-y-8 animate-scale-in">
                    {/* Sparkle icon */}
                    <div className="flex justify-center animate-fade-in-up">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
                            <Sparkles className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>

                    {/* Main heading */}
                    <div className="text-center space-y-4 animate-fade-in-up animation-delay-100">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold gradient-text">
                            Welcome to {user?.firstName}&apos;s Nova
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Your beautiful workspace for capturing ideas, organizing thoughts, and collaborating seamlessly.
                        </p>
                    </div>

                    {/* CTA Button */}
                    <div className="flex justify-center animate-fade-in-up animation-delay-200">
                        <Button
                            onClick={onCreate}
                            size="lg"
                            className="cta-button text-white hover:text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg"
                        >
                            <PlusCircle className="h-5 w-5 mr-2" />
                            Create your first note
                        </Button>
                    </div>

                    {/* Feature highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 animate-fade-in-up animation-delay-300">
                        <div className="feature-card p-4 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur-sm text-center space-y-2 border border-white/20">
                            <div className="flex justify-center">
                                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                            </div>
                            <h3 className="font-semibold text-sm dark:text-white">Lightning Fast</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                Instant note creation and seamless editing
                            </p>
                        </div>

                        <div className="feature-card p-4 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur-sm text-center space-y-2 border border-white/20">
                            <div className="flex justify-center">
                                <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                            </div>
                            <h3 className="font-semibold text-sm dark:text-white">Rich Formatting</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                Beautiful editor with powerful formatting tools
                            </p>
                        </div>

                        <div className="feature-card p-4 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur-sm text-center space-y-2 border border-white/20">
                            <div className="flex justify-center">
                                <Users className="h-6 w-6 text-pink-600 dark:text-pink-300" />
                            </div>
                            <h3 className="font-semibold text-sm dark:text-white">Collaborative</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                Share and collaborate with your team in real-time
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentsPage;
