import { createTRPCRouter } from "../trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  auth: authRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
