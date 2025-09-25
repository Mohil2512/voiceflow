// Static notification page that doesn't use any client-side React features
// This ensures it can be safely rendered during build time without hooks

import { Layout } from "@/components/layout/Layout";

export default function NotificationPage() {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading notifications...</p>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Simple redirect script that runs in the browser
                window.location.href = '/notification';
              `,
            }}
          />
        </div>
      </div>
    </Layout>
  );
}

// Disable automatic static optimization to prevent SSG
export const getInitialProps = async () => {
  return { props: {} };
};