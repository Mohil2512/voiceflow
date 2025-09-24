import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth/next'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Voiceflow - Connect, Share, Grow',
  description: 'Join the vibrant Voiceflow community where ideas flow freely. Share your thoughts and connect with people worldwide.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Force a dark mode flash instead of light mode flash */}
        <style dangerouslySetInnerHTML={{ 
          __html: `
            :root {
              color-scheme: dark;
            }
            html {
              color-scheme: dark;
            }
            body {
              background-color: black;
              color: white;
            }
            
            /* Initial loading spinner */
            .initial-loader {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: black;
              z-index: 9999;
            }
            .initial-loader .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top-color: white;
              animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `
        }} />
        {/* Add a script to hide loader when content is ready */}
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              setTimeout(() => {
                const loader = document.querySelector('.initial-loader');
                if (loader) {
                  loader.style.opacity = '0';
                  loader.style.transition = 'opacity 0.3s';
                  setTimeout(() => {
                    if (loader.parentNode) {
                      loader.parentNode.removeChild(loader);
                    }
                  }, 300);
                }
              }, 1500);
            });
          `
        }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Initial loader that shows before hydration */}
        <div className="initial-loader">
          <div className="spinner"></div>
        </div>
        
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}