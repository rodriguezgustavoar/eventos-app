import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import NavbarAdmin from '@/components/NavbarAdmin'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Eventos App',
  description: 'Sistema de gestión de reservas e invitaciones digitales',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-50 text-gray-900 flex flex-col`}>
        <NavbarAdmin />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  )
}