'use client'

import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'
import { Home, Search, Bell, MessageSquare, User } from 'lucide-react'
import Link from 'next/link'

export default function MobileNav() {
  const { user, profile, unreadMessages, pendingMessages, unreadNotifications } = useUser()
  const pathname = usePathname()

  // Don't show on auth pages or landing
  if (!user || pathname === '/' || pathname.startsWith('/auth')) {
    return null
  }

  const totalMessageBadge = (unreadMessages || 0) + (pendingMessages || 0)
  const notifBadge = unreadNotifications || 0

  const navItems = [
    { href: '/feed', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/notifications', icon: Bell, label: 'Alerts', badge: notifBadge },
    { href: '/messages', icon: MessageSquare, label: 'Messages', badge: totalMessageBadge },
    { href: profile?.username ? `/u/${profile.username}` : `/profile/${user?.id}`, icon: User, label: 'Profile' },
  ]

  const isActive = (href) => {
    if (href === '/feed') return pathname === '/feed'
    if (href.startsWith('/u/') || href.startsWith('/profile/')) {
      return pathname.startsWith('/u/') || pathname.startsWith('/profile/')
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
              isActive(item.href)
                ? 'text-white'
                : 'text-muted-foreground'
            }`}
          >
            <div className="relative">
              <item.icon className="h-6 w-6" strokeWidth={1.5} />
              {item.badge > 0 && (
                <div className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
            </div>
            <span className="text-[10px] mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  )
}
