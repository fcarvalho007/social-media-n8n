import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function CacheDaConta({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  useEffect(() => () => { void client.cancelQueries(); client.clear(); }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** A session change gets a fresh cache before any screen can read the old account's rows. */
export function AccountQueryProvider({ accountId, children }: { accountId: string | null; children: ReactNode }) {
  return <CacheDaConta key={accountId ?? 'anonimo'}>{children}</CacheDaConta>;
}
