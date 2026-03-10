import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { loginInput, validateCredentials } from "@/server/services/auth.service";
import { authenticateSsoUser } from "@/server/services/sso-auth.service";
import { authConfig } from "./auth.config";
import type { GlobalRole } from "@prisma/client";
import { z } from "zod";

const ssoLoginInput = z.object({
  providerId: z.string().min(1),
  externalId: z.string().min(1),
  attributes: z.record(z.string(), z.string()).default({}),
  groups: z.array(z.string()).default([]),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginInput.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await validateCredentials(parsed.data.email, parsed.data.password);

        if (user) {
          logger.info({ userId: user.id }, "User authenticated via credentials");
        }

        return user;
      },
    }),
    CredentialsProvider({
      id: "sso",
      name: "SSO",
      credentials: {
        providerId: { label: "Provider ID", type: "text" },
        externalId: { label: "External ID", type: "text" },
        attributes: { label: "Attributes", type: "text" },
        groups: { label: "Groups", type: "text" },
      },
      async authorize(credentials) {
        let rawAttributes: Record<string, string> = {};
        let rawGroups: string[] = [];

        try {
          if (typeof credentials?.attributes === "string") {
            rawAttributes = JSON.parse(credentials.attributes) as Record<string, string>;
          }
        } catch {
          logger.warn("SSO login: failed to parse attributes JSON");
          return null;
        }

        try {
          if (typeof credentials?.groups === "string") {
            rawGroups = JSON.parse(credentials.groups) as string[];
          }
        } catch {
          logger.warn("SSO login: failed to parse groups JSON");
          return null;
        }

        const parsed = ssoLoginInput.safeParse({
          providerId: credentials?.providerId,
          externalId: credentials?.externalId,
          attributes: rawAttributes,
          groups: rawGroups,
        });

        if (!parsed.success) {
          return null;
        }

        const user = await authenticateSsoUser(parsed.data);
        return user;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { globalRole: true },
        });
        if (dbUser) {
          token.globalRole = dbUser.globalRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.id === "string" && session.user) {
        session.user.id = token.id;
        session.user.globalRole = token.globalRole as GlobalRole | undefined;
      }
      return session;
    },
  },
});
