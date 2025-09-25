"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import NotificationPage from "./page";

export default function NotificationWrapper() {
  // This is a client component that wraps the notification page
  // and provides the session data
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/signin?callbackUrl=/notification");
    },
  });

  // Show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Render the notification page
  return <NotificationPage />;
}