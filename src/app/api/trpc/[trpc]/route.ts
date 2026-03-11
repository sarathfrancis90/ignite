import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/routers/root";
import { createTRPCContext } from "@/server/trpc/trpc";
import "@/server/events/register-listeners";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });
}

export { handler as GET, handler as POST };
