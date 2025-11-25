import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
    '/:locale/sign-in(.*)',
    '/:locale/sign-up(.*)',
    '/s/(.*)',
    '/:locale/s/(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
    // Skip intl middleware for API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
        if (!isPublicRoute(request)) {
            await auth.protect();
        }
        return;
    }

    if (!isPublicRoute(request)) {
        await auth.protect();
    }

    return intlMiddleware(request);
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
