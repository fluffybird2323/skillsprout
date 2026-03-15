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
      <body className="font-sans overscroll-y-none">
        {children}
        <footer className="fixed bottom-0 left-0 right-0 z-0 py-2 text-center text-[11px] text-gray-400 bg-transparent pointer-events-none">
          <span className="pointer-events-auto">
            <a href="/terms" className="underline hover:text-gray-600 mx-2">Terms of Service</a>
            <a href="/privacy" className="underline hover:text-gray-600 mx-2">Privacy Policy</a>
          </span>
        </footer>
      </body>
    </html>
  )
}