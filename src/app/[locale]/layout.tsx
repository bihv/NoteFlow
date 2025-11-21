import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import "../ai-styles.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Nova - Block-based Knowledge Management",
    description: "A modern note-taking app with block-based editing, similar to Notion",
    icons: {
        icon: "/favicon.ico",
    },
};

export default async function LocaleLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}>) {
    const { locale } = await params;
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={inter.className}>
                <NextIntlClientProvider messages={messages}>
                    <ClerkProvider>
                        <ConvexClientProvider>
                            <ThemeProvider
                                attribute="class"
                                defaultTheme="system"
                                enableSystem
                                disableTransitionOnChange
                                storageKey="nova-theme"
                            >
                                <Toaster position="bottom-center" />
                                {children}
                            </ThemeProvider>
                        </ConvexClientProvider>
                    </ClerkProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
