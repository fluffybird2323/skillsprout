import './globals.css'
import { Inter } from 'next/font/google'
import { Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Manabu | Smart Learning Platform',
  description: 'A next-generation AI learning platform. Generate interactive courses instantly.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Manabu',
  },
  openGraph: {
    type: 'website',
    title: 'Manabu - Interactive Learning',
    description: 'Generate complete, gamified courses for any topic instantly. Powered by AI.',
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#121317',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="font-sans overscroll-y-none">{children}</body>
    </html>
  )
}