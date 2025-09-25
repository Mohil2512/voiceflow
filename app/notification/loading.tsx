"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Layout } from "@/components/layout/Layout";

export default function NotificationStaticPage() {
  // This is a simple static version of the notification page that's safe for SSR
  // It will be shown during server-side rendering, then client components will take over
  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </div>
    </Layout>
  );
}