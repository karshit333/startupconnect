'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import FeedSkeleton, { CardSkeleton } from '@/components/FeedSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TrendingUp, Calendar, Users, ArrowRight, Bookmark } from 'lucide-react'
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

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

      const processedPosts = postsData?.map(post => ({
        ...post,
        likes_count: post.likes?.length || 0,
        user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
      })) || []
      setPosts(processedPosts)

      const { data: startups } = await supabase
        .from('startups')
        .select('*')
        .eq('is_approved', true)
        .limit(5)
      setTrendingStartups(startups || [])

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
              <CardSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1128px] mx-auto">
          {/* Left Sidebar - Profile Card */}
          <div className="hidden lg:block">
            <Card className="overflow-hidden">
              <div className="h-14 bg-gradient-to-r from-primary/30 to-primary/10" />
              <div className="-mt-7 px-4 pb-4">
                <Link href={`/profile/${user?.id}`}>
                  <Avatar className="h-16 w-16 border-2 border-white ring-2 ring-background">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">{getInitials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                </Link>
                <Link href={`/profile/${user?.id}`} className="block mt-2">
                  <h3 className="font-semibold hover:underline">{profile?.full_name}</h3>
                </Link>
                {profile?.bio ? (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{profile?.bio}</p>
                ) : (
                  <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
                )}
              </div>
              <div className="border-t px-4 py-3">
                <Link href={`/profile/${user?.id}`} className="text-xs text-muted-foreground hover:text-primary flex items-center justify-between">
                  <span>Profile viewers</span>
                  <span className="text-primary font-semibold">12</span>
                </Link>
              </div>
              <div className="border-t px-4 py-3">
                <Link href="/saved" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
                  <Bookmark className="h-4 w-4" />
                  Saved items
                </Link>
              </div>
            </Card>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-2">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Follow startups to see their updates in your feed
                  </p>
                  <Link href="/search">
                    <Button className="bg-primary hover:bg-primary/90">
                      Discover Startups
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block space-y-2">
            {/* Trending Startups */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  Trending Startups
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
                      className="flex items-center gap-3 p-2 -mx-2 rounded hover:bg-secondary transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={startup.logo_url} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {startup.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{startup.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{startup.domain}</p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
              <div className="border-t p-2">
                <Link href="/search" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 py-1">
                  View all startups
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  Upcoming Events
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No upcoming events</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href="/events"
                      className="block p-2 -mx-2 rounded hover:bg-secondary transition-colors"
                    >
                      <p className="text-sm font-semibold truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.event_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {event.city && ` · ${event.city}`}
                      </p>
                    </Link>
                  ))
                )}
              </CardContent>
              <div className="border-t p-2">
                <Link href="/events" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 py-1">
                  View all events
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
