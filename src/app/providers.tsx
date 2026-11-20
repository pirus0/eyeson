"use client";

import { LoginGate } from "@/components/LoginGate";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LoginGate>
      <StoreProvider>{children}</StoreProvider>
    </LoginGate>
  );
}
