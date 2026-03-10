import { createTRPCRouter } from "../trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { campaignRouter } from "./campaign";
import { channelRouter } from "./channel";
import { spaceRouter } from "./space";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  auth: authRouter,
  campaign: campaignRouter,
  channel: channelRouter,
  space: spaceRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
