import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { UserProvider } from '@/lib/context/UserContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Startup Connect India',
  description: 'Professional networking platform for the Indian startup ecosystem',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          {children}
        </UserProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
