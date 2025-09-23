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
          `
        }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}