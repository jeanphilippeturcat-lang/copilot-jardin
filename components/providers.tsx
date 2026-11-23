"use client";

import { SWRConfig } from "swr";
import { useMemo } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Providers({ children }: { children: React.ReactNode }) {
  const swrConfig = useMemo(
    () => ({
      fetcher,
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }),
    []
  );

  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
