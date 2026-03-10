import NextAuth from "next-auth";
import { authConfig } from "@/server/lib/auth.config";

/**
 * Server-side route protection middleware.
 * Uses the Edge-compatible auth config (no Prisma, bcryptjs, or Node.js modules).
 * The `authorized` callback in auth.config.ts handles the protection logic:
 * - Public paths (/, /login, /register) are always accessible
 * - All other routes require authentication (redirects to /login)
 * - Admin routes require PLATFORM_ADMIN or INNOVATION_MANAGER role
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (handled by their own auth)
     * - _next (static files)
     * - favicon, images, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
