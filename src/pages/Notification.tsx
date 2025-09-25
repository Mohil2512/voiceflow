import { useEffect } from 'react';
import { Layout } from "@/components/layout/Layout";
import { useRouter } from 'next/navigation';

/**
 * This is a simple redirect component that forwards users from the old Pages Router path
 * to the new App Router path for notifications
 */
export default function NotificationRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Client-side redirect to the new App Router path
    router.replace('/notification');
  }, [router]);
  
  // Simple loading indicator while redirecting
  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          <p className="ml-2">Redirecting to notifications...</p>
        </div>
      </div>
    </Layout>
  );
}