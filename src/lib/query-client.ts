import { QueryClient } from "@tanstack/react-query";

let clientQueryClientSingleton: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
        },
      },
    });
  }
  clientQueryClientSingleton ??= new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
    },
  });
  return clientQueryClientSingleton;
}
