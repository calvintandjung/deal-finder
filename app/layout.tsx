import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Home, Search, Calculator, TrendingUp, Users, Settings } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Deal Finder - Real Estate Investment Platform',
  description: 'Find wholesaling opportunities, ADU plays, and investment deals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation */}
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <Link href="/" className="flex items-center px-2 text-gray-900 font-bold text-xl">
                    🏡 Deal Finder
                  </Link>
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                    <Link
                      href="/"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                    <Link
                      href="/properties"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Properties
                    </Link>
                    <Link
                      href="/calculator"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculator
                    </Link>
                    <Link
                      href="/deals"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Active Deals
                    </Link>
                    <Link
                      href="/outreach"
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Outreach
                    </Link>
                  </div>
                </div>
                <div className="flex items-center">
                  <Link
                    href="/settings"
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                  >
                    <Settings className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-12">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-500">
                Deal Finder © 2026 - Real Estate Investment Platform
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
