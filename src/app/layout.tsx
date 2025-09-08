import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ProtectedRoute from '@/components/ProtectedRoute'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IA Generator SEO - by IDE | Negócios Digitais',
  description: 'Sistema inteligente de gestão de produtos com IA para SEO',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </ProtectedRoute>
      </body>
    </html>
  )
}
