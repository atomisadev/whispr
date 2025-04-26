import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware((auth, req) => {
  // Protect routes that match the isProtectedRoute definition
  if (isProtectedRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
    "/",
    "/api/((?!trpc).*)",
  ],
};
