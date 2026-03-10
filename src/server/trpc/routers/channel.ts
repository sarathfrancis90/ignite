import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  channelCreateInput,
  channelUpdateInput,
  channelListInput,
  channelGetByIdInput,
} from "@/server/services/channel.schemas";
import {
  listChannels,
  getChannelById,
  createChannel,
  updateChannel,
  archiveChannel,
  ChannelServiceError,
} from "@/server/services/channel.service";
import { z } from "zod";

function handleChannelError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ChannelServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      CHANNEL_NOT_FOUND: "NOT_FOUND",
      ALREADY_ARCHIVED: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const channelRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.CHANNEL_READ))
    .input(channelListInput)
    .query(async ({ input }) => {
      return listChannels(input);
    }),

  getById: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CHANNEL_READ, (input) => input.id))
    .input(channelGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getChannelById(input.id);
      } catch (error) {
        handleChannelError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.CHANNEL_CREATE))
    .input(channelCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createChannel(input, ctx.session.user.id);
      } catch (error) {
        handleChannelError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CHANNEL_UPDATE, (input) => input.id))
    .input(channelUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateChannel(input, ctx.session.user.id);
      } catch (error) {
        handleChannelError(error);
      }
    }),

  archive: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CHANNEL_MANAGE, (input) => input.id))
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveChannel(input.id, ctx.session.user.id);
      } catch (error) {
        handleChannelError(error);
      }
    }),
});
