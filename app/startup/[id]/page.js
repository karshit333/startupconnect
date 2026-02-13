'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Users, Globe, UserPlus, UserMinus, MessageSquare, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

export default function StartupDetailPage() {
  const { id } = useParams()
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

      const { data: startupData } = await supabase
        .from('startups')
        .select('*')
        .eq('id', id)
        .single()
      setStartup(startupData)

      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          startups (id, name, logo_url, domain),
          likes (user_id),
          comments (id, content, created_at, profiles:user_id (full_name, avatar_url))
        `)
        .eq('startup_id', id)
        .order('created_at', { ascending: false })

      const processedPosts = postsData?.map(post => ({
        ...post,
        likes_count: post.likes?.length || 0,
        user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
      })) || []
      setPosts(processedPosts)

      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('startup_id', id)
        .eq('user_id', user.id)
        .single()
      setIsFollowing(!!followData)

      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('startup_id', id)
      setFollowersCount(count || 0)

      setLoading(false)
    }
    loadStartup()
  }, [id])

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('startup_id', id).eq('user_id', currentUser.id)
        setFollowersCount(prev => prev - 1)
        toast.success(`Unfollowed ${startup.name}`)
      } else {
        await supabase.from('follows').insert({ startup_id: id, user_id: currentUser.id })
        setFollowersCount(prev => prev + 1)
        toast.success(`Now following ${startup.name}`)
      }
      setIsFollowing(!isFollowing)
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const startConversation = async () => {
    if (!startup?.user_id) {
      toast.error('Cannot message this startup')
      return
    }

    // Don't message yourself
    if (startup.user_id === currentUser.id) {
      toast.error('You cannot message your own startup')
      return
    }

    try {
      // Check if conversation exists - use two separate queries for reliability
      const { data: existing1 } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', currentUser.id)
        .eq('participant_2', startup.user_id)
        .maybeSingle()

      const { data: existing2 } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', startup.user_id)
        .eq('participant_2', currentUser.id)
        .maybeSingle()

      const existing = existing1 || existing2

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

        if (error) throw error
        router.push(`/messages?chat=${newConvo.id}`)
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      toast.error('Failed to start conversation')
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S'

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-lg border border-border p-6 h-64 skeleton" />
          </div>
        </div>
      </div>
    )
  }

  if (!startup) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-4xl mx-auto bg-card border-border">
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold">Startup not found</h2>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-white/10 to-white/5" />
            <CardContent className="relative pb-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar className="h-28 w-28 border-4 border-card -mt-14 shadow-lg">
                  <AvatarImage src={startup.logo_url} />
                  <AvatarFallback className="text-3xl bg-white/10">{getInitials(startup.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 sm:mt-2">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-semibold">{startup.name}</h1>
                        {startup.is_approved ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                            <Clock className="h-3 w-3 mr-1" />Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge className="bg-white/10 capitalize">{startup.domain}</Badge>
                        {startup.stage && <Badge variant="outline" className="border-white/20 capitalize">{startup.stage}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={isFollowing ? 'outline' : 'default'}
                        onClick={handleFollow}
                        className={isFollowing ? 'border-white/20' : 'bg-white text-background hover:bg-white/90'}
                      >
                        {isFollowing ? <><UserMinus className="h-4 w-4 mr-2" />Following</> : <><UserPlus className="h-4 w-4 mr-2" />Follow</>}
                      </Button>
                      <Button variant="outline" onClick={startConversation} className="border-white/20">
                        <MessageSquare className="h-4 w-4 mr-2" />Message
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-muted-foreground">{startup.description}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {startup.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{startup.location}</span>}
                {startup.team_size && <span className="flex items-center gap-1"><Users className="h-4 w-4" />{startup.team_size} members</span>}
                {startup.website && (
                  <a href={startup.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white">
                    <Globe className="h-4 w-4" />Website
                  </a>
                )}
                <span className="flex items-center gap-1"><UserPlus className="h-4 w-4" />{followersCount} followers</span>
              </div>
            </CardContent>
          </Card>

          {/* Posts */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No posts yet</div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
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
