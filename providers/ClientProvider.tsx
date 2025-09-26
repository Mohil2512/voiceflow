"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * ClientProvider component that wraps the application with SessionProvider
 * This ensures that useSession hooks are only used in client components
 * and prevents server rendering issues with NextAuth
 */
export default function ClientProvider({ children, session }: { children: ReactNode, session?: any }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}