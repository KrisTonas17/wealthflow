import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WealthFlow — Real Take-Home & Growth Planner',
  description: 'See your real take-home pay after 2026 taxes, build your budget, and project your wealth with interactive compound growth tools.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
