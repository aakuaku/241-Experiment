import type { Metadata } from 'next'
import './globals.css'
import HeaderContent from '@/components/HeaderContent'

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
        <HeaderContent />
        {children}
      </body>
    </html>
  )
}
