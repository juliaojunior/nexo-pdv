import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/menu(.*)',   // Public catalog logic for customers
  '/process(.*)',// Payment / deep link processing might need to be public or handled internally, keeping public for now.
  '/api/shorten(.*)', // Shortener proxy API
  '/api/webhook(.*)', // Clerk webhooks if we add them later
  '/sign-in(.*)', // Public login page
  '/sign-up(.*)', // Public signup page
  '/sso-callback(.*)', // SSOCallback para OAuth do Clerk
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Protect all other routes (forces admin login)
    await auth.protect()
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
