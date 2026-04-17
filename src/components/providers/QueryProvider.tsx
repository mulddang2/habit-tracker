"use client";

import "../../../sentry.client.config";
import { useState, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
  onlineManager,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as Sentry from "@sentry/nextjs";
import { useSyncOnReconnect } from "@/hooks/useSyncOnReconnect";

function OnlineManagerSetup() {
  useEffect(() => {
    onlineManager.setEventListener((setOnline) => {
      const onOnline = () => setOnline(true);
      const onOffline = () => setOnline(false);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    });
  }, []);

  useSyncOnReconnect();
  return null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            Sentry.captureException(error, {
              tags: { source: "react-query" },
            });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            Sentry.captureException(error, {
              tags: { source: "react-query-mutation" },
            });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OnlineManagerSetup />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
