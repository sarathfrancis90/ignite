import { router } from "@/lib/trpc";
import { commentRouter } from "./comment.router";

export const appRouter = router({
  comment: commentRouter,
});

export type AppRouter = typeof appRouter;
