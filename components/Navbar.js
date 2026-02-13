'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
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
import { Home, Search, MessageSquare, Calendar, User, Building2, Settings, LogOut, Shield, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
      }
    }
    loadUser()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const navItems = [
    { href: '/feed', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/events', icon: Calendar, label: 'Events' },
  ]

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  const isActive = (href) => pathname === href

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Search */}
          <div className="flex items-center gap-3">
            <Link href="/feed" className="flex items-center">
              <img src="/logo.png" alt="SUCI" className="h-8" />
            </Link>
            
            {/* Search Bar */}
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

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <button
                  className={`flex flex-col items-center justify-center px-4 h-14 border-b-2 transition-colors ${
                    isActive(item.href) 
                      ? 'border-white text-white' 
                      : 'border-transparent text-muted-foreground hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] mt-0.5 hidden lg:block">{item.label}</span>
                </button>
              </Link>
            ))}

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
                      <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-3 h-8 border-white/20 hover:bg-white/5"
                    onClick={() => router.push(`/profile/${user?.id}`)}
                  >
                    View Profile
                  </Button>
                </div>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Account</DropdownMenuLabel>
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
        </div>
      </div>
    </header>
  )
}
