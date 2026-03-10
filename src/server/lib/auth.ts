import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { loginInput, validateCredentials } from "@/server/services/auth.service";
import { authConfig } from "./auth.config";
import type { GlobalRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
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
