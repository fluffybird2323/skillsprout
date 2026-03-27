import './globals.css'
import { Inter } from 'next/font/google'
import { Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Manabu | AI-Powered Learning Platform',
  description: 'Generate complete, gamified courses on any topic in seconds. Manabu uses AI to create structured lessons, quizzes, and progress tracking — free.',
  keywords: ['AI learning', 'online courses', 'AI tutor', 'gamified learning', 'learn anything', 'course generator', 'adaptive learning', 'manabu'],
  metadataBase: new URL('https://manabu.artiestudio.org'),
  alternates: {
    canonical: 'https://manabu.artiestudio.org',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Manabu',
  },
  openGraph: {
    type: 'website',
    url: 'https://manabu.artiestudio.org',
    siteName: 'Manabu',
    title: 'Manabu — Generate AI Courses on Any Topic',
    description: 'Enter any topic and get a full interactive course with lessons, quizzes, and gamification instantly. Powered by AI.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manabu — AI Learning Platform',
    description: 'Generate complete courses on any topic instantly. Free, gamified, AI-powered.',
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