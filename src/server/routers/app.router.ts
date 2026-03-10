import { router } from "@/server/trpc/trpc";
import { bucketRouter } from "./bucket.router";

export const appRouter = router({
  bucket: bucketRouter,
});

export type AppRouter = typeof appRouter;
