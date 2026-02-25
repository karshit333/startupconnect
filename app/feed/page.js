'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import PostCard from '@/components/PostCard'
import FeedSkeleton, { CardSkeleton } from '@/components/FeedSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TrendingUp, Calendar, Users, ArrowRight, Bookmark, Clock } from 'lucide-react'
import Link from 'next/link'

// Module-level cache for feed data - persists across navigations
const feedCache = {
  posts: [],
  startups: [],
  events: [],
  lastFetch: 0,
  profilesMap: {}
}

export default function FeedPage() {
  const { user, profile, startup, supabase, isInitialized } = useUser()
  // Initialize with cached data for INSTANT display
  const [posts, setPosts] = useState(feedCache.posts)
  const [trendingStartups, setTrendingStartups] = useState(feedCache.startups)
  const [upcomingEvents, setUpcomingEvents] = useState(feedCache.events)
  const [loading, setLoading] = useState(feedCache.posts.length === 0)
  const router = useRouter()
  const fetchingRef = useRef(false)
  const mountedRef = useRef(true)

  // Redirect if not logged in
  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/auth/login')
    }
  }, [isInitialized, user, router])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // OPTIMIZED: Load feed data with aggressive caching and parallel fetching
  const loadFeedData = useCallback(async (forceRefresh = false) => {
    if (!user || !supabase) return
    if (fetchingRef.current) return
    
    // Use cache if recent (within 60 seconds for better perf)
    const now = Date.now()
    const cacheAge = now - feedCache.lastFetch
    if (!forceRefresh && feedCache.posts.length > 0 && cacheAge < 60000) {
      if (mountedRef.current) {
        setPosts(feedCache.posts)
        setTrendingStartups(feedCache.startups)
        setUpcomingEvents(feedCache.events)
        setLoading(false)
      }
      return
    }

    fetchingRef.current = true

    try {
      // OPTIMIZED: Single parallel fetch for all main data
      const [postsResult, startupsResult, eventsResult, savedResult] = await Promise.all([
        supabase.from('posts').select(`
          id, content, image_url, created_at, startup_id,
          startups (id, name, logo_url, domain, username),
          likes (user_id),
          comments (id, content, created_at, user_id)
        `).order('created_at', { ascending: false }).limit(20),
        supabase.from('startups').select('id, name, logo_url, domain, username').eq('is_approved', true).limit(5),
        supabase.from('events').select('id, title, event_date, city').gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(3),
        supabase.from('saved_posts').select('post_id').eq('user_id', user.id)
      ])

      if (!mountedRef.current) return

      // Update startups and events immediately
      const startups = startupsResult.data || []
      const events = eventsResult.data || []
      feedCache.startups = startups
      feedCache.events = events
      setTrendingStartups(startups)
      setUpcomingEvents(events)

      // Create saved posts lookup
      const savedPostsSet = new Set(savedResult.data?.map(sp => sp.post_id) || [])

      // Process posts
      const postsData = postsResult.data || []
      
      // Collect all comment user IDs for batch fetching profiles
      const allCommentUserIds = new Set()
      postsData.forEach(post => {
        post.comments?.forEach(c => allCommentUserIds.add(c.user_id))
      })

      // Batch fetch comment author profiles
      let profilesMap = {}
      if (allCommentUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', Array.from(allCommentUserIds))
        profiles?.forEach(p => { profilesMap[p.id] = p })
      }

      // Process posts with all data
      const processedPosts = postsData.map(post => ({
        ...post,
        comments: post.comments?.map(comment => ({
          ...comment,
          profiles: profilesMap[comment.user_id] || null
        })) || [],
        likes_count: post.likes?.length || 0,
        user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
        user_has_saved: savedPostsSet.has(post.id)
      }))

      // Update cache and state
      feedCache.posts = processedPosts
      feedCache.lastFetch = Date.now()
      
      if (mountedRef.current) {
        setPosts(processedPosts)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error loading feed:', error)
      if (mountedRef.current) setLoading(false)
    } finally {
      fetchingRef.current = false
    }
  }, [user, supabase])

  // Load data when user is ready
  useEffect(() => {
    if (isInitialized && user) {
      loadFeedData()
    }
  }, [isInitialized, user, loadFeedData])

  // OPTIMIZED: Debounced real-time subscription for new posts
  useEffect(() => {
    if (!supabase || !user) return

    let refreshTimeout = null
    const channel = supabase
      .channel('feed-posts-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, () => {
        // Debounce rapid inserts
        if (refreshTimeout) clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          loadFeedData(true)
        }, 1000)
      })
      .subscribe()

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      supabase.removeChannel(channel)
    }
  }, [supabase, user, loadFeedData])

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  // Show loading only if no cached data
  if (!isInitialized || (loading && posts.length === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1128px] mx-auto">
            <div className="hidden lg:block">
              <CardSkeleton />
            </div>
            <div className="lg:col-span-2">
              <FeedSkeleton count={3} />
            </div>
            <div className="hidden lg:block space-y-4">
              <CardSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      {/* Pending Approval Banner for Startups */}
      {profile?.role === 'startup' && startup && startup.is_approved !== true && startup.is_approved !== 'true' && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-sm text-yellow-500">
              <Clock className="h-4 w-4" />
              <span>Your startup is pending approval. You can browse but cannot post yet.</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1128px] mx-auto">
          {/* Left Sidebar */}
          <div className="hidden lg:block">
            <Card className="bg-card border-border overflow-hidden">
              <div className="h-14 bg-gradient-to-r from-white/10 to-white/5" />
              <div className="-mt-6 px-4 pb-4">
                <Link href={profile?.username ? `/u/${profile.username}` : `/profile/${user?.id}`}>
                  <Avatar className="h-14 w-14 border-2 border-card">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-white/10">{getInitials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                </Link>
                <Link href={profile?.username ? `/u/${profile.username}` : `/profile/${user?.id}`} className="block mt-2">
                  <h3 className="font-semibold hover:underline">{profile?.full_name}</h3>
                </Link>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>
              <div className="border-t border-border px-4 py-3">
                <Link href="/saved" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white">
                  <Bookmark className="h-4 w-4" />
                  Saved items
                </Link>
              </div>
            </Card>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-2">
            {posts.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Follow startups to see their updates
                  </p>
                  <Link href="/search">
                    <Button className="bg-white text-background hover:bg-white/90">
                      Discover Startups
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                    onPostDelete={(postId) => {
                      setPosts(prev => prev.filter(p => p.id !== postId))
                      feedCache.posts = feedCache.posts.filter(p => p.id !== postId)
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block space-y-4">
            {/* Trending */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  Trending
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-2">
                {trendingStartups.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No startups yet</p>
                ) : (
                  trendingStartups.map((startup) => (
                    <Link
                      key={startup.id}
                      href={`/startup/${startup.id}`}
                      className="flex items-center gap-3 p-2 -mx-2 rounded hover:bg-white/5 transition-colors"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={startup.logo_url} />
                        <AvatarFallback className="text-xs bg-white/10">
                          {startup.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{startup.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{startup.domain}</p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
              <div className="border-t border-border p-2">
                <Link href="/search" className="text-xs text-muted-foreground hover:text-white flex items-center justify-center gap-1 py-1">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>

            {/* Events */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  Events
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No events</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href="/events"
                      className="block p-2 -mx-2 rounded hover:bg-white/5 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.event_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        {event.city && ` · ${event.city}`}
                      </p>
                    </Link>
                  ))
                )}
              </CardContent>
              <div className="border-t border-border p-2">
                <Link href="/events" className="text-xs text-muted-foreground hover:text-white flex items-center justify-center gap-1 py-1">
                  View all events
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
