/**
 * Document Page
 * 
 * NOTE: This page is NOT rendered when using the tab system.
 * The actual rendering is handled by:
 * - layout.tsx → detects document route
 * - TabContainer → renders all tabs
 * - DocumentContent → renders each document
 * 
 * This file exists ONLY for Next.js routing structure.
 * It serves as a fallback for edge cases or direct navigation.
 */

interface DocumentIdPageProps {
    params: Promise<{
        documentId: string;
    }>;
}

export default function DocumentIdPage({ params }: DocumentIdPageProps) {
    // This component is intentionally minimal because layout.tsx
    // renders TabContainer instead when on document routes
    return null;
}
