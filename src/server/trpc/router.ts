import { router } from "./trpc";
import { ideaRouter } from "./routers/idea";

export const appRouter = router({
  idea: ideaRouter,
});

export type AppRouter = typeof appRouter;
