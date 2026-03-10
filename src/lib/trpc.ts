import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/trpc/routers/root";

export const trpc = createTRPCReact<AppRouter>();
