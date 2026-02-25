'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Home, Search, MessageSquare, Calendar, Building2, Settings, LogOut, Shield, ChevronDown, Bookmark, Plus, Bell } from 'lucide-react'
import Link from 'next/link'
import CreatePostDialog from './CreatePostDialog'

export default function Navbar() {
  const { user, profile, startup, unreadMessages, pendingMessages, unreadNotifications, signOut, isLoading } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handlePostCreated = () => {
    router.refresh()
  }

  const totalMessageBadge = (unreadMessages || 0) + (pendingMessages || 0)
  const notifBadge = unreadNotifications || 0

  const navItems = useMemo(() => [
    { href: '/feed', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/notifications', icon: Bell, label: 'Alerts', badge: notifBadge },
    { href: '/messages', icon: MessageSquare, label: 'Messages', badge: totalMessageBadge },
    { href: '/events', icon: Calendar, label: 'Events' },
  ], [totalMessageBadge, notifBadge])

  const getInitials = useCallback((name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }, [])

  const isActive = useCallback((href) => pathname === href, [pathname])

  // Check if user is a startup (show post button regardless of approval - dialog will handle the check)
  const isStartupUser = profile?.role === 'startup'
  // Check if startup can actually create posts
  const canCreatePost = isStartupUser && startup && (startup.is_approved === true || startup.is_approved === 'true')

  // Don't render navbar if still loading initial data
  if (isLoading && !profile) {
    return (
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-14">
            <div className="flex items-center gap-3">
              <Link href="/feed" className="flex items-center">
                <img src="/logo.png" alt="SUCI" className="h-10 md:h-12" />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full skeleton" />
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Search */}
            <div className="flex items-center gap-3">
              <Link href="/feed" className="flex items-center" prefetch={true}>
                <img src="/logo.png" alt="SUCI" className="h-10 md:h-12" />
              </Link>
              
              {/* Search Bar - Desktop only */}
              <form onSubmit={handleSearch} className="hidden md:flex">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search"
                    className="w-[240px] pl-9 h-9 bg-secondary border-0 text-sm focus-visible:ring-1 focus-visible:ring-white/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            </div>

            {/* Navigation - Desktop only */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} prefetch={true}>
                  <button
                    className={`flex flex-col items-center justify-center px-4 h-14 border-b-2 transition-colors relative ${
                      isActive(item.href) 
                        ? 'border-white text-white' 
                        : 'border-transparent text-muted-foreground hover:text-white'
                    }`}
                  >
                    <div className="relative">
                      <item.icon className="h-5 w-5" strokeWidth={1.5} />
                      {item.badge > 0 && (
                        <div className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {item.badge > 9 ? '9+' : item.badge}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] mt-0.5 hidden lg:block">{item.label}</span>
                  </button>
                </Link>
              ))}

              {/* Create Post Button (for ALL startup users - approval checked in dialog) */}
              {isStartupUser && (
                <button
                  onClick={() => setCreatePostOpen(true)}
                  className="flex flex-col items-center justify-center px-4 h-14 border-b-2 border-transparent text-muted-foreground hover:text-white transition-colors"
                >
                  <Plus className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] mt-0.5 hidden lg:block">Post</span>
                </button>
              )}

              {/* Divider */}
              <div className="h-8 w-px bg-border mx-2" />

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex flex-col items-center justify-center px-3 h-14 text-muted-foreground hover:text-white transition-colors">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-white/10">{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] mt-0.5 hidden lg:flex items-center gap-0.5">
                      Me <ChevronDown className="h-3 w-3" />
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-card border-border">
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-white/10">{getInitials(profile?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{profile?.full_name || 'User'}</p>
                        {profile?.username && (
                          <p className="text-xs text-muted-foreground">@{profile.username}</p>
                        )}
                        <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-3 h-8 border-white/20 hover:bg-white/5"
                      onClick={() => router.push(profile?.username ? `/u/${profile.username}` : `/profile/${user?.id}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Account</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push('/saved')} className="cursor-pointer">
                    <Bookmark className="mr-2 h-4 w-4" />
                    Saved Items
                  </DropdownMenuItem>
                  {profile?.role === 'startup' && (
                    <DropdownMenuItem onClick={() => router.push('/my-startup')} className="cursor-pointer">
                      <Building2 className="mr-2 h-4 w-4" />
                      My Startup
                    </DropdownMenuItem>
                  )}
                  {profile?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Mobile - only show create post button for startups */}
            {canCreatePost && (
              <button
                onClick={() => setCreatePostOpen(true)}
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-full bg-white text-background"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Create Post Dialog */}
      {canCreatePost && (
        <CreatePostDialog
          open={createPostOpen}
          onOpenChange={setCreatePostOpen}
          startup={startup}
          onPostCreated={handlePostCreated}
        />
      )}
    </>
  )
}
