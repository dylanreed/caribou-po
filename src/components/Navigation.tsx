'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/purchase-orders', label: 'Purchase Orders' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/suppliers', label: 'Suppliers' },
  { href: '/products', label: 'Products' },
  { href: '/colors', label: 'Colors' },
  { href: '/pantone', label: 'Pantone' },
  { href: '/retailers', label: 'Retailers' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-maroon-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Image
              src="/caribou-logo.png"
              alt="Caribou Lodge"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-maroon-800 text-caramel-100'
                      : 'text-caramel-100/80 hover:text-caramel-100 hover:bg-maroon-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
