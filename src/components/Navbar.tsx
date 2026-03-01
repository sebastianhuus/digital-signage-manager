'use client'

import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: '/screens', label: 'Screens' },
  { href: '/screen-groups', label: 'Groups' },
  { href: '/assets', label: 'Assets' },
  { href: '/presets', label: 'Presets' },
]

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  if (!session) return null

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <button
            onClick={() => router.push('/')}
            className="font-semibold text-lg text-gray-900 hover:text-gray-600 transition-colors"
          >
            Signage Manager
          </button>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
