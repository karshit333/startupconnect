'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Users, Globe, MessageSquare, Calendar, Edit, UserPlus, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export default function UsernamePage() {
  const { username } = useParams()
  const router = useRouter()
  const [profileData, setProfileData] = useState(null)
  const [startupData, setStartupData] = useState(null)
  const [posts, setPosts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const supabase = createClient()

  const cleanUsername = username?.toLowerCase()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)

      // First check if it's a user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanUsername)
        .single()

      if (profile) {
        setProfileData(profile)
        
        // If it's a startup account, also get their startup
        if (profile.role === 'startup') {
          const { data: startup } = await supabase
            .from('startups')
            .select('*')
            .eq('user_id', profile.id)
            .single()
          
          if (startup) {
            setStartupData(startup)
            
            // Get startup posts
            const { data: postsData } = await supabase
              .from('posts')
              .select(`
                *,
                startups (id, name, logo_url, domain, username),
                likes (user_id),
                comments (id, content, created_at, profiles:user_id (full_name, avatar_url, username))
              `)
              .eq('startup_id', startup.id)
              .order('created_at', { ascending: false })

            const processedPosts = postsData?.map(post => ({
              ...post,
              likes_count: post.likes?.length || 0,
              user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
            })) || []
            setPosts(processedPosts)

            // Check if following
            const { data: follow } = await supabase
              .from('follows')
              .select('id')
              .eq('user_id', user.id)
              .eq('startup_id', startup.id)
              .maybeSingle()
            setIsFollowing(!!follow)

            // Get followers count
            const { count } = await supabase
              .from('follows')
              .select('id', { count: 'exact' })
              .eq('startup_id', startup.id)
            setFollowersCount(count || 0)
          }
        }
        setLoading(false)
        return
      }

      // Check if it's a startup username
      const { data: startup } = await supabase
        .from('startups')
        .select('*')
        .eq('username', cleanUsername)
        .single()

      if (startup) {
        setStartupData(startup)
        
        // Get owner profile
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', startup.user_id)
          .single()
        setProfileData(ownerProfile)

        // Get posts
        const { data: postsData } = await supabase
          .from('posts')
          .select(`
            *,
            startups (id, name, logo_url, domain, username),
            likes (user_id),
            comments (id, content, created_at, profiles:user_id (full_name, avatar_url, username))
          `)
          .eq('startup_id', startup.id)
          .order('created_at', { ascending: false })

        const processedPosts = postsData?.map(post => ({
          ...post,
          likes_count: post.likes?.length || 0,
          user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
        })) || []
        setPosts(processedPosts)

        // Check follow status
        const { data: follow } = await supabase
          .from('follows')
          .select('id')
          .eq('user_id', user.id)
          .eq('startup_id', startup.id)
          .maybeSingle()
        setIsFollowing(!!follow)

        const { count } = await supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('startup_id', startup.id)
        setFollowersCount(count || 0)

        setLoading(false)
        return
      }

      // Not found
      setLoading(false)
    }
    loadProfile()
  }, [cleanUsername])

  const toggleFollow = async () => {
    if (!startupData) return
    
    try {
      if (isFollowing) {
        await supabase.from('follows').delete()
          .eq('user_id', currentUser.id)
          .eq('startup_id', startupData.id)
        setFollowersCount(prev => prev - 1)
      } else {
        await supabase.from('follows').insert({
          user_id: currentUser.id,
          startup_id: startupData.id
        })
        setFollowersCount(prev => prev + 1)
      }
      setIsFollowing(!isFollowing)
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const startConversation = async () => {
    if (!profileData?.id) return

    try {
      const { data: existing1 } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', currentUser.id)
        .eq('participant_2', profileData.id)
        .maybeSingle()

      const { data: existing2 } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', profileData.id)
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
            participant_2: profileData.id,
            is_accepted: false
          })
          .select()
          .single()

        if (error) throw error
        router.push(`/messages?chat=${newConvo.id}`)
      }
    } catch (error) {
      toast.error('Failed to start conversation')
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  const isOwnProfile = currentUser?.id === profileData?.id

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="h-64 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!profileData && !startupData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-2xl mx-auto bg-card border-border">
            <CardContent className="py-16 text-center">
              <h2 className="text-xl font-semibold mb-2">User not found</h2>
              <p className="text-muted-foreground">@{cleanUsername} doesn't exist</p>
              <Button onClick={() => router.push('/search')} className="mt-4 bg-white text-background">
                Search Users
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Startup profile view
  if (startupData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Startup Header */}
            <Card className="bg-card border-border overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-white/10 to-white/5" />
              <CardContent className="relative pb-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Avatar className="h-28 w-28 border-4 border-card -mt-14 shadow-lg">
                    <AvatarImage src={startupData.logo_url} />
                    <AvatarFallback className="text-3xl bg-white/10">
                      {startupData.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 sm:mt-2">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-2xl font-bold">{startupData.name}</h1>
                          {startupData.is_approved ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                              <Clock className="h-3 w-3 mr-1" />Pending
                            </Badge>
                          )}
                        </div>
                        {startupData.username && (
                          <p className="text-muted-foreground">@{startupData.username}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Badge className="bg-white/10">{startupData.domain}</Badge>
                          {startupData.stage && <Badge variant="outline" className="border-white/20">{startupData.stage}</Badge>}
                        </div>
                      </div>
                      {!isOwnProfile && (
                        <div className="flex gap-2">
                          <Button
                            onClick={toggleFollow}
                            variant={isFollowing ? 'outline' : 'default'}
                            size="sm"
                            className={isFollowing ? 'border-white/20' : 'bg-white text-background'}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </Button>
                          <Button onClick={startConversation} variant="outline" size="sm" className="border-white/20">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-muted-foreground">{startupData.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {startupData.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{startupData.location}</span>
                  )}
                  {startupData.team_size && (
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" />{startupData.team_size} members</span>
                  )}
                  <span className="flex items-center gap-1"><UserPlus className="h-4 w-4" />{followersCount} followers</span>
                </div>
              </CardContent>
            </Card>

            {/* Posts */}
            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                ))}
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No posts yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Regular user profile
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-white/10 to-white/5" />
            <CardContent className="relative pb-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar className="h-24 w-24 border-4 border-card -mt-12 shadow-lg">
                  <AvatarImage src={profileData?.avatar_url} />
                  <AvatarFallback className="text-2xl bg-white/10">{getInitials(profileData?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 sm:mt-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-xl font-bold">{profileData?.full_name}</h1>
                      {profileData?.username && (
                        <p className="text-muted-foreground">@{profileData.username}</p>
                      )}
                      <p className="text-sm text-muted-foreground capitalize mt-1">{profileData?.role}</p>
                    </div>
                    {isOwnProfile ? (
                      <Button variant="outline" size="sm" className="border-white/20" onClick={() => router.push('/settings')}>
                        <Edit className="h-4 w-4 mr-2" />Edit Profile
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-white text-background" onClick={startConversation}>
                        <MessageSquare className="h-4 w-4 mr-2" />Message
                      </Button>
                    )}
                  </div>
                  {profileData?.bio && (
                    <p className="mt-3 text-muted-foreground">{profileData.bio}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Joined {formatDistanceToNow(new Date(profileData?.created_at), { addSuffix: true })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
