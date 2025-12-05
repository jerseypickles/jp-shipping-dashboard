import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Package, 
  Printer, 
  BarChart3, 
  Wallet,
  Truck,
  Settings
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'JP Shipping Hub',
  description: 'Jersey Pickles Shipping Dashboard',
}

function Sidebar() {
  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/orders', icon: Package, label: 'Orders' },
    { href: '/shipments', icon: Truck, label: 'Shipments' },
    { href: '/labels', icon: Printer, label: 'Print Queue' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/wallet', icon: Wallet, label: 'Expenses' },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-10 h-10 bg-pickle-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-xl">🥒</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900">JP Shipping</h1>
          <p className="text-xs text-gray-500">Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <item.icon className="w-5 h-5 text-gray-500" />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 text-gray-500 text-sm">
          <Settings className="w-4 h-4" />
          <span>v3.0 - Expense Tracker</span>
        </div>
      </div>
    </aside>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Sidebar />
        <main className="ml-64 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
