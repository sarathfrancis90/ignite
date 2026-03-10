import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { loginInput, validateCredentials } from "@/server/services/auth.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.id === "string" && session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
