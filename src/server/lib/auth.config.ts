import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * Edge-compatible auth configuration for use in Next.js middleware.
 * This config MUST NOT import Node.js-only modules (Prisma, bcryptjs, events, pino).
 * The full auth config in auth.ts extends this with adapter and authorize logic.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers: [
    // Credentials provider defined here for type compatibility;
    // the actual authorize function is overridden in auth.ts
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null,
    }),
    // SSO provider stub for edge compatibility;
    // the actual authorize function is overridden in auth.ts
    CredentialsProvider({
      id: "sso",
      name: "SSO",
      credentials: {
        providerId: { label: "Provider ID", type: "text" },
        externalId: { label: "External ID", type: "text" },
        attributes: { label: "Attributes", type: "text" },
        groups: { label: "Groups", type: "text" },
      },
      authorize: () => null,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isPublicPath =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/api/auth/sso");

      if (isPublicPath) {
        return true;
      }

      if (!isAuthenticated) {
        return false; // NextAuth will redirect to signIn page
      }

      // Admin routes require PLATFORM_ADMIN or INNOVATION_MANAGER role
      if (pathname.startsWith("/admin")) {
        const user = auth?.user;
        const role = user && "globalRole" in user ? user.globalRole : undefined;
        if (role !== "PLATFORM_ADMIN" && role !== "INNOVATION_MANAGER") {
          return Response.redirect(new URL("/dashboard", nextUrl.origin));
        }
      }

      return true;
    },
  },
};
