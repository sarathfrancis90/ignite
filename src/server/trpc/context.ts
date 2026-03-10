import { type PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface Session {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
}

export interface Context {
  prisma: PrismaClient;
  session: Session | null;
}

export function createContext(session: Session | null = null): Context {
  return {
    prisma,
    session,
  };
}
