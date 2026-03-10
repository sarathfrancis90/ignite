"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink, type TRPCClientError } from "@trpc/client";
import { trpc } from "./trpc";
import { getQueryClient } from "@/lib/query-client";
import type { AppRouter } from "@/server/trpc/routers/root";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function isUnauthorizedError(error: unknown): boolean {
  // Check for tRPC UNAUTHORIZED error (from protectedProcedure)
  const trpcError = error as TRPCClientError<AppRouter> | undefined;
  if (trpcError?.data?.code === "UNAUTHORIZED") return true;

  // Check for HTTP 401 (from middleware JSON response)
  if (
    trpcError &&
    "meta" in trpcError &&
    typeof trpcError.meta === "object" &&
    trpcError.meta !== null &&
    "response" in trpcError.meta
  ) {
    const response = trpcError.meta.response as { status?: number } | undefined;
    if (response?.status === 401) return true;
  }

  return false;
}

/**
 * Global handler for tRPC query errors.
 * Redirects to /login on UNAUTHORIZED to prevent 401 errors
 * from rendering on protected pages (fixes #142, #143, #144, #145).
 */
function handleQueryError(error: unknown) {
  if (typeof window !== "undefined" && isUnauthorizedError(error)) {
    const currentPath = window.location.pathname;
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
    window.location.href = loginUrl;
  }
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient({ onError: handleQueryError });
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
