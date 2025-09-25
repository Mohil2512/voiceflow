// This is a server component that doesn't use any client-side hooks
// It provides a simple loading UI and dynamically loads the client component

import { Layout } from "@/components/layout/Layout";
import { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import the client component with SSR disabled
const ClientNotifications = dynamic(
  () => import("./client-notifications"),
  { ssr: false } // This is critical - prevents SSR for this component
);

export const metadata: Metadata = {
  title: 'Notifications | Voiceflow',
  description: 'View your notifications',
};

// This is a simple server component that doesn't use any client hooks
export default function NotificationStaticPage() {
  return (
    <Layout>
      <div className="flex-1 max-w-2xl mx-auto bg-background text-foreground min-h-screen">
        <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border p-4 z-10">
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        </div>
        
        <Suspense fallback={
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <p className="ml-3">Loading your notifications...</p>
          </div>
        }>
          <ClientNotifications />
        </Suspense>
      </div>
    </Layout>
  );
}