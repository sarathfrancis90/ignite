import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";

interface QueryClientOptions {
  onError?: (error: unknown) => void;
}

let clientQueryClientSingleton: QueryClient | undefined;

export function getQueryClient(options?: QueryClientOptions) {
  const { onError } = options ?? {};

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
    queryCache: new QueryCache({
      onError: onError,
    }),
    mutationCache: new MutationCache({
      onError: onError,
    }),
  });

  return clientQueryClientSingleton;
}
