import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SkillSprout | Agentic Learning Platform',
  description: 'A next-generation AI learning platform. Generate interactive curriculums instantly.',
  themeColor: '#121317',
  openGraph: {
    type: 'website',
    title: 'SkillSprout - Antigravity Learning',
    description: 'Generate complete, gamified curriculums for any topic instantly. Powered by Gemini.',
  },
  twitter: {
    card: 'summary_large_image',
  },
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