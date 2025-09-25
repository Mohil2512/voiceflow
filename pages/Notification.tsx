"use client";

import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useRouter } from "next/navigation";

// This component acts as a compatibility layer for the Pages Router version
// It simply redirects to the App Router version
export default function NotificationRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the App Router version
    router.replace("/notification");
  }, [router]);

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting to notifications...</p>
        </div>
      </div>
    </Layout>
  );
}