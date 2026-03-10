import { createTRPCRouter } from "../trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { campaignRouter } from "./campaign";
import { channelRouter } from "./channel";
import { commentRouter } from "./comment";
import { ideaRouter } from "./idea";
import { organizationRouter } from "./organization";
import { spaceRouter } from "./space";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  auth: authRouter,
  campaign: campaignRouter,
  channel: channelRouter,
  comment: commentRouter,
  idea: ideaRouter,
  organization: organizationRouter,
  space: spaceRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
