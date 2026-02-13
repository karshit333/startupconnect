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
import { Home, Search, MessageSquare, Calendar, User, Building2, Settings, LogOut, Shield, ChevronDown, Bell } from 'lucide-react'
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
    { href: '/messages', icon: MessageSquare, label: 'Messaging' },
    { href: '/events', icon: Calendar, label: 'Events' },
  ]

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  const isActive = (href) => pathname === href

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[52px]">
          {/* Logo & Search */}
          <div className="flex items-center gap-2">
            <Link href="/feed" className="flex items-center">
              <div className="w-[34px] h-[34px] bg-primary rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">in</span>
              </div>
            </Link>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:flex">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  className="w-[280px] pl-9 h-[34px] bg-secondary border-0 text-sm focus-visible:ring-1 focus-visible:ring-foreground/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          </div>

          {/* Navigation */}
          <nav className="flex items-center">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <button
                  className={`flex flex-col items-center justify-center w-[80px] h-[52px] border-b-2 transition-colors ${
                    isActive(item.href) 
                      ? 'border-foreground text-foreground' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-xs mt-0.5 hidden lg:block">{item.label}</span>
                </button>
              </Link>
            ))}

            {/* Divider */}
            <div className="h-[40px] w-px bg-border mx-1" />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center justify-center w-[80px] h-[52px] text-muted-foreground hover:text-foreground transition-colors">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs mt-0.5 hidden lg:flex items-center gap-0.5">
                    Me <ChevronDown className="h-3 w-3" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px]">
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="text-lg bg-primary/10 text-primary">{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{profile?.bio?.slice(0, 50) || profile?.role}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-3 h-8 text-primary border-primary hover:bg-primary/5"
                    onClick={() => router.push(`/profile/${user?.id}`)}
                  >
                    View Profile
                  </Button>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Account</DropdownMenuLabel>
                {profile?.role === 'startup' && (
                  <DropdownMenuItem onClick={() => router.push('/my-startup')}>
                    <Building2 className="mr-2 h-4 w-4" />
                    My Startup
                  </DropdownMenuItem>
                )}
                {profile?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings & Privacy
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
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
