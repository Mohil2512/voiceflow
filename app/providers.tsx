'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from "@/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useState } from "react";
import dynamic from "next/dynamic";
import { DataProvider } from "@/providers/data-provider";

// Import theme components with no SSR to avoid hydration mismatch
const ThemeFix = dynamic(() => import("@/components/ui/theme-fix"), { ssr: false });
const ThemeScript = dynamic(() => import("@/components/ui/theme-script"), { ssr: false });

interface ProvidersProps {
  children: React.ReactNode;
  session?: any;
}

export function Providers({ children, session }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <ThemeProvider defaultTheme="dark" storageKey="voiceflow-theme">
          <DataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ThemeFix />
              <ThemeScript />
              {children}
            </TooltipProvider>
          </DataProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}