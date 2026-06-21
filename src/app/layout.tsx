import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Policy-Governed Liquidity Curation Agent on Hedera',
  description: 'AI-powered liquidity curation on Hedera, governed by Hedera Agent Kit v4 policies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
