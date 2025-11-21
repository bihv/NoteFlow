"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { useRouter } from "@/lib/navigation";
import { Spinner } from "@/components/spinner";
import { useEffect } from "react";

export default function HomePage() {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/documents");
        }
    }, [isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="text-center space-y-6 p-8">
                <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Welcome to Nova
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    A modern block-based knowledge management system. Create, organize, and collaborate on your ideas.
                </p>
                <div className="flex gap-4 justify-center pt-4">
                    <SignInButton mode="modal">
                        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            Sign In
                        </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                        <button className="px-6 py-3 bg-white text-gray-700 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700">
                            Get Started
                        </button>
                    </SignUpButton>
                </div>
            </div>
        </div>
    );
}
