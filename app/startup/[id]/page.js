'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Users, Globe, UserPlus, UserMinus, MessageSquare, Calendar, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function StartupDetailPage({ params }) {
  const { id } = use(params)
  const [startup, setStartup] = useState(null)
  const [posts, setPosts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadStartup() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)

      // Load startup
      const { data: startupData } = await supabase
        .from('startups')
        .select('*')
        .eq('id', id)
        .single()
      setStartup(startupData)

      // Load posts
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
        .eq('startup_id', id)
        .order('created_at', { ascending: false })

      const processedPosts = postsData?.map(post => ({
        ...post,
        likes_count: post.likes?.length || 0,
        user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
      })) || []
      setPosts(processedPosts)

      // Check if following
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('startup_id', id)
        .eq('user_id', user.id)
        .single()
      setIsFollowing(!!followData)

      // Get followers count
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('startup_id', id)
      setFollowersCount(count || 0)

      setLoading(false)
    }
    loadStartup()
  }, [id, router, supabase])

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('startup_id', id)
          .eq('user_id', currentUser.id)
        setFollowersCount(prev => prev - 1)
        toast.success(`Unfollowed ${startup.name}`)
      } else {
        await supabase.from('follows').insert({
          startup_id: id,
          user_id: currentUser.id,
        })
        setFollowersCount(prev => prev + 1)
        toast.success(`Now following ${startup.name}`)
      }
      setIsFollowing(!isFollowing)
    } catch (error) {
      toast.error('Failed to update follow status')
    }
  }

  const startConversation = async () => {
    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${currentUser.id},participant_2.eq.${startup.user_id}),and(participant_1.eq.${startup.user_id},participant_2.eq.${currentUser.id})`)
      .single()

    if (existing) {
      router.push(`/messages?chat=${existing.id}`)
    } else {
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: currentUser.id,
          participant_2: startup.user_id,
        })
        .select()
        .single()

      if (!error) {
        router.push(`/messages?chat=${newConvo.id}`)
      } else {
        toast.error('Failed to start conversation')
      }
    }
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S'
  }

  const getDomainLabel = (domain) => {
    const labels = {
      'fintech': 'FinTech',
      'healthtech': 'HealthTech',
      'edtech': 'EdTech',
      'ecommerce': 'E-Commerce',
      'saas': 'SaaS',
      'ai-ml': 'AI/ML',
      'deeptech': 'DeepTech',
      'consumer': 'Consumer',
      'b2b': 'B2B',
    }
    return labels[domain] || domain
  }

  const getStageLabel = (stage) => {
    const labels = {
      'idea': 'Idea Stage',
      'mvp': 'MVP',
      'pre-seed': 'Pre-Seed',
      'seed': 'Seed',
      'series-a': 'Series A',
      'series-b': 'Series B+',
      'profitable': 'Profitable',
    }
    return labels[stage] || stage
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6 skeleton-shimmer h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (!startup) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold">Startup not found</h2>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Startup Header */}
          <Card>
            <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 rounded-t-lg" />
            <CardContent className="relative pb-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar className="h-28 w-28 border-4 border-white -mt-14 shadow-lg">
                  <AvatarImage src={startup.logo_url} />
                  <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                    {getInitials(startup.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 sm:mt-2">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{startup.name}</h1>
                        {startup.is_approved ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge>{getDomainLabel(startup.domain)}</Badge>
                        {startup.stage && (
                          <Badge variant="outline">{getStageLabel(startup.stage)}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={isFollowing ? 'outline' : 'default'}
                        onClick={handleFollow}
                      >
                        {isFollowing ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={startConversation}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-muted-foreground">{startup.description}</p>
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {startup.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {startup.location}
                  </span>
                )}
                {startup.team_size && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {startup.team_size} members
                  </span>
                )}
                {startup.website && (
                  <a
                    href={startup.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <UserPlus className="h-4 w-4" />
                  {followersCount} followers
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No posts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUser?.id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
