import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
