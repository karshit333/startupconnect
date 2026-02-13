'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import FeedSkeleton from '@/components/FeedSkeleton'
import StartupCard from '@/components/StartupCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TrendingUp, Calendar, Users } from 'lucide-react'
import Link from 'next/link'

export default function FeedPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [trendingStartups, setTrendingStartups] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Load posts with startup info, likes count, and comments
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          startups (id, name, logo_url, domain),
          likes (user_id),
          comments (
            id,
            content,
            created_at,
            profiles:user_id (full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      // Process posts to add likes_count and user_has_liked
      const processedPosts = postsData?.map(post => ({
        ...post,
        likes_count: post.likes?.length || 0,
        user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
      })) || []
      setPosts(processedPosts)

      // Load trending startups (approved ones with most followers)
      const { data: startups } = await supabase
        .from('startups')
        .select('*')
        .eq('is_approved', true)
        .limit(5)
      setTrendingStartups(startups || [])

      // Load upcoming events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(3)
      setUpcomingEvents(events || [])

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="hidden lg:block">
              <div className="bg-white rounded-lg p-4 h-48 skeleton-shimmer" />
            </div>
            <div className="lg:col-span-2">
              <FeedSkeleton />
            </div>
            <div className="hidden lg:block">
              <div className="bg-white rounded-lg p-4 h-64 skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile Card */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-3">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-lg">{getInitials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{profile?.full_name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
                  {profile?.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{profile?.bio}</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Link href={`/profile/${user?.id}`}>
                    <Button variant="outline" className="w-full" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-2">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Follow startups to see their updates here.
                  </p>
                  <Link href="/search">
                    <Button>Discover Startups</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block space-y-4">
            {/* Trending Startups */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending Startups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingStartups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No startups yet</p>
                ) : (
                  trendingStartups.map((startup) => (
                    <Link
                      key={startup.id}
                      href={`/startup/${startup.id}`}
                      className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={startup.logo_url} />
                        <AvatarFallback className="text-xs">
                          {startup.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{startup.name}</p>
                        <p className="text-xs text-muted-foreground">{startup.domain}</p>
                      </div>
                    </Link>
                  ))
                )}
                <Link href="/search">
                  <Button variant="ghost" className="w-full" size="sm">
                    See more
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href="/events"
                      className="block hover:bg-muted p-2 rounded-lg transition-colors"
                    >
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.event_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {event.city && ` • ${event.city}`}
                      </p>
                    </Link>
                  ))
                )}
                <Link href="/events">
                  <Button variant="ghost" className="w-full" size="sm">
                    View all events
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
