import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin - Voiceflow',
  description: 'Admin dashboard for Voiceflow',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}