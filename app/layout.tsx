import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Model Selection Experiment',
  description: 'Research experiment on developer model selection behavior',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="floating-header">
          <div className="floating-header-content">
            <div className="floating-header-text">241 experiment</div>
            <Link href="/dashboard" className="dashboard-link">
              Admin Dashboard
            </Link>
          </div>
        </div>
        {children}
      </body>
    </html>
  )
}
