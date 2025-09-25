"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotificationRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the App Router version of the page
    router.replace('/notification');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
        <p className="mt-4">Redirecting...</p>
      </div>
    </div>
  );
}