import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";

export const updateProfileInput = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  skills: z.array(z.string().max(50)).max(20, "Maximum 20 skills").optional(),
  notificationFrequency: z.enum(["IMMEDIATE", "DAILY", "WEEKLY"]).optional(),
  image: z.string().url().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      bio: true,
      skills: true,
      notificationFrequency: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new UserServiceError("User not found", "USER_NOT_FOUND");
  }

  return user;
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.bio !== undefined) data.bio = input.bio;
  if (input.skills !== undefined) data.skills = input.skills;
  if (input.notificationFrequency !== undefined)
    data.notificationFrequency = input.notificationFrequency;
  if (input.image !== undefined) data.image = input.image;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      bio: true,
      skills: true,
      notificationFrequency: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info({ userId: user.id }, "User profile updated");

  eventBus.emit("user.profileUpdated", {
    entity: "user",
    entityId: user.id,
    actor: user.id,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(input) },
  });

  return user;
}

export class UserServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "UserServiceError";
    this.code = code;
  }
}
