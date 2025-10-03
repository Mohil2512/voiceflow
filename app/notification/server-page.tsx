// This is a server component that shows "Yet to be implemented"

import { Layout } from "@/components/layout/Layout";
import { Metadata } from "next";
import { Bell } from "lucide-react";

export const metadata: Metadata = {
  title: 'Notifications | Voiceflow',
  description: 'View your notifications',
};

// Simple server component showing "Yet to be implemented"
export default function NotificationStaticPage() {
  return (
    <Layout>
      <div className="flex-1 max-w-2xl mx-auto bg-black text-white min-h-screen">
        <div className="sticky top-0 bg-black border-b border-gray-800 p-4 z-10">
          <h1 className="text-xl font-bold text-white">Notifications</h1>
        </div>
        
        <div className="flex flex-col items-center justify-center py-20">
          <Bell className="h-16 w-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">Yet to be implemented</h2>
          <p className="text-gray-500 text-center">
            Notifications feature is coming soon.<br />
            Stay tuned for updates!
          </p>
        </div>
      </div>
    </Layout>
  );
}