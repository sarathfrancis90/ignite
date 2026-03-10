import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";

const BCRYPT_COST_FACTOR = 12;

export const registerInput = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one number"),
  name: z.string().min(1, "Name is required").max(100),
});

export type RegisterInput = z.infer<typeof registerInput>;

export const loginInput = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginInput>;

export async function registerUser(input: RegisterInput) {
  const { email, password, name } = input;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new AuthServiceError("An account with this email already exists", "EMAIL_EXISTS");
  }

  const hashedPassword = await hash(password, BCRYPT_COST_FACTOR);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
    },
  });

  logger.info({ userId: user.id }, "New user registered");

  eventBus.emit("user.registered", {
    entity: "user",
    entityId: user.id,
    actor: user.id,
    timestamp: new Date().toISOString(),
    metadata: { email: user.email, name: user.name },
  });

  return user;
}

export async function validateCredentials(email: string, password: string) {
  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user?.password) {
    return null;
  }

  const isValid = await compare(password, user.password);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

export class AuthServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
  }
}
