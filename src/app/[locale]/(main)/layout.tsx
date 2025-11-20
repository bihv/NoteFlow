"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, usePathname } from "@/lib/navigation";
import { Spinner } from "@/components/spinner";
import { Navigation } from "./_components/navigation";
import { TabBar } from "@/components/tabs/tab-bar";
import { TabContainer } from "@/components/tabs/tab-container";
import { TabKeyboardShortcuts } from "@/components/tabs/tab-keyboard-shortcuts";
import { TabsProvider } from "@/contexts/tabs-context";
import { useEffect } from "react";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isAuthenticated && !isLoading) {
            router.push("/");
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="h-full flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    // Check if we're on a document route
    const isDocumentRoute = pathname?.includes("/documents/");

    return (
        <TabsProvider>
            <div className="h-full flex dark:bg-[#1F1F1F]">
                <TabKeyboardShortcuts />
                <Navigation />
                <div className="flex-1 h-full max-w-full overflow-x-hidden flex flex-col transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 240px)' }}>
                    <TabBar />
                    <main className="flex-1">
                        {isDocumentRoute ? <TabContainer /> : children}
                    </main>
                </div>
            </div>
        </TabsProvider>
    );
}
