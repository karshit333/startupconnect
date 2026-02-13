'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Home, Search, MessageSquare, Calendar, User, Building2, Settings, LogOut, Shield, ChevronDown, Bookmark, Plus } from 'lucide-react'
import Link from 'next/link'
import CreatePostDialog from './CreatePostDialog'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [startup, setStartup] = useState(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [pendingMessages, setPendingMessages] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Memoize supabase client to prevent recreation
  const loadUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // If startup role, fetch startup
      if (profileData?.role === 'startup') {
        const { data: startupData } = await supabase
          .from('startups')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setStartup(startupData)
      }

      // Get unread message count
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, is_accepted, participant_1')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)

      if (convos) {
        let unread = 0
        let pending = 0
        
        for (const convo of convos) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', convo.id)
            .neq('sender_id', user.id)
            .eq('is_read', false)
          
          unread += count || 0
          
          // Count pending (message requests)
          if (!convo.is_accepted && convo.participant_1 !== user.id) {
            pending++
          }
        }
        
        setUnreadMessages(unread)
        setPendingMessages(pending)
      }
    }
  }, [supabase])

  useEffect(() => {
    loadUserData()
    
    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('navbar-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, () => {
        // Reload unread count when new message arrives
        loadUserData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadUserData])

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

  const handlePostCreated = (post) => {
    // Refresh the page or update state as needed
    router.refresh()
  }

  const navItems = useMemo(() => [
    { href: '/feed', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/messages', icon: MessageSquare, label: 'Messages', badge: unreadMessages + pendingMessages },
    { href: '/events', icon: Calendar, label: 'Events' },
  ], [unreadMessages, pendingMessages])

  const getInitials = useCallback((name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }, [])

  const isActive = useCallback((href) => pathname === href, [pathname])

  const canCreatePost = profile?.role === 'startup' && startup?.is_approved

  return (
    <>
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Search */}
            <div className="flex items-center gap-3">
              <Link href="/feed" className="flex items-center" prefetch={true}>
                <img src="/logo.png" alt="SUCI" className="h-12" />
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

              {/* Create Post Button (for startups) */}
              {canCreatePost && (
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
                      onClick={() => router.push(profile?.username ? `/@${profile.username}` : `/profile/${user?.id}`)}
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
