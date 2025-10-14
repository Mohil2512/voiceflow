'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ClientProvider from "@/providers/ClientProvider";
import { ThemeProvider } from "@/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import dynamic from "next/dynamic";
import { DataProvider } from "@/providers/data-provider";

// Import theme components with no SSR to avoid hydration mismatch
const ThemeFix = dynamic(() => import("@/components/ui/theme-fix"), { ssr: false });
const ThemeScript = dynamic(() => import("@/components/ui/theme-script"), { ssr: false });

interface ProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    }
  }));
  
  // Add loading state management
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Set a timeout to ensure we don't show loading forever if something goes wrong
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    // Try to initialize theme early
    const initializeApp = async () => {
      // Short timeout to ensure other initialization happens
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsLoading(false);
    };
    
    initializeApp();
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ClientProvider session={session}>
        <ThemeProvider defaultTheme="dark" storageKey="voiceflow-theme">
          {/* Theme script first for early theme application */}
          <ThemeScript />
          <ThemeFix />
          
          <DataProvider>
            <TooltipProvider>
              {!isLoading && children}
              {isLoading && (
                <div className="min-h-screen flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
                </div>
              )}
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </DataProvider>
        </ThemeProvider>
      </ClientProvider>
    </QueryClientProvider>
  );
}