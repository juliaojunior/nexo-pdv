import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/c(.*)',      // Rota Principal da Vitrine Universal (Catálogo Público)
  '/menu(.*)',   // Legacy catalog
  '/process(.*)',
  '/api/settings(.*)',// Permitimos a API settings ser buscada de fora caso via GET ?userId
  '/api/catalog(.*)', // Futuras APIs publicas
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/sso-callback(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Protect all other internal routes (forces admin login for /products, /settings, etc)
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
