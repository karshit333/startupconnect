'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import PostCard from '@/components/PostCard'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Users, Globe, MessageSquare, Calendar, Edit, UserPlus, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'

// Module-level cache for profile data
const profileCache = {
  data: {},
  lastFetch: {}
}

export default function UsernamePage() {
  const { username } = useParams()
  const router = useRouter()
  const { user, supabase, isInitialized } = useUser()
  
  const cleanUsername = username?.toLowerCase()
  
  // Initialize with cached data if available
  const cachedData = profileCache.data[cleanUsername]
  const [profileData, setProfileData] = useState(cachedData?.profile || null)
  const [startupData, setStartupData] = useState(cachedData?.startup || null)
  const [posts, setPosts] = useState(cachedData?.posts || [])
  const [loading, setLoading] = useState(!cachedData)
  const [isFollowing, setIsFollowing] = useState(cachedData?.isFollowing || false)
  const [followersCount, setFollowersCount] = useState(cachedData?.followersCount || 0)
  const [followingCount, setFollowingCount] = useState(cachedData?.followingCount || 0)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Redirect if not logged in
  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/auth/login')
    }
  }, [isInitialized, user, router])

  const loadStartupPosts = useCallback(async (startup) => {
    if (!user || !supabase) return

    // OPTIMIZED: Fetch all data in parallel
    const [postsResult, followResult, followersResult, savedResult] = await Promise.all([
      supabase.from('posts').select(`
        id, content, image_url, created_at, startup_id,
        startups (id, name, logo_url, domain, username),
        likes (user_id),
        comments (id, content, created_at, user_id)
      `).eq('startup_id', startup.id).order('created_at', { ascending: false }),
      supabase.from('follows').select('id').eq('user_id', user.id).eq('startup_id', startup.id).maybeSingle(),
      supabase.from('follows').select('id', { count: 'exact' }).eq('startup_id', startup.id),
      supabase.from('saved_posts').select('post_id').eq('user_id', user.id)
    ])

    if (!mountedRef.current) return

    setIsFollowing(!!followResult.data)
    setFollowersCount(followersResult.count || 0)

    const postsData = postsResult.data || []
    const savedPostsSet = new Set(savedResult.data?.map(sp => sp.post_id) || [])

    // Batch fetch comment author profiles
    const allCommentUserIds = new Set()
    postsData.forEach(post => {
      post.comments?.forEach(c => allCommentUserIds.add(c.user_id))
    })

    let profilesMap = {}
    if (allCommentUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', Array.from(allCommentUserIds))
      profiles?.forEach(p => { profilesMap[p.id] = p })
    }

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
    
    if (mountedRef.current) {
      setPosts(processedPosts)
      
      // Update cache
      profileCache.data[cleanUsername] = {
        ...profileCache.data[cleanUsername],
        posts: processedPosts,
        isFollowing: !!followResult.data,
        followersCount: followersResult.count || 0
      }
    }
  }, [user, supabase, cleanUsername])

  const loadProfile = useCallback(async () => {
    if (!user || !supabase) return

    // Check cache first (within 30 seconds)
    const cacheTime = profileCache.lastFetch[cleanUsername] || 0
    if (Date.now() - cacheTime < 30000 && profileCache.data[cleanUsername]) {
      const cached = profileCache.data[cleanUsername]
      if (mountedRef.current) {
        setProfileData(cached.profile)
        setStartupData(cached.startup)
        setPosts(cached.posts || [])
        setIsFollowing(cached.isFollowing || false)
        setFollowersCount(cached.followersCount || 0)
        setFollowingCount(cached.followingCount || 0)
        setLoading(false)
      }
      return
    }

    // Try to find user profile first
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', cleanUsername)
      .single()

    if (profile) {
      if (mountedRef.current) setProfileData(profile)
      
      // Get following count for this user
      const { count: followingCt } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      
      if (mountedRef.current) setFollowingCount(followingCt || 0)
      
      // If it's a startup account, get their startup
      if (profile.role === 'startup') {
        const { data: startup } = await supabase
          .from('startups')
          .select('*')
          .eq('user_id', profile.id)
          .single()
        
        if (startup && mountedRef.current) {
          setStartupData(startup)
          await loadStartupPosts(startup)
          
          // Update cache
          profileCache.data[cleanUsername] = {
            profile,
            startup,
            posts: profileCache.data[cleanUsername]?.posts || [],
            isFollowing: profileCache.data[cleanUsername]?.isFollowing || false,
            followersCount: profileCache.data[cleanUsername]?.followersCount || 0,
            followingCount: followingCt || 0
          }
          profileCache.lastFetch[cleanUsername] = Date.now()
        }
      } else {
        // Update cache for regular user
        profileCache.data[cleanUsername] = {
          profile,
          startup: null,
          posts: [],
          isFollowing: false,
          followersCount: 0,
          followingCount: followingCt || 0
        }
        profileCache.lastFetch[cleanUsername] = Date.now()
      }
      if (mountedRef.current) setLoading(false)
      return
    }

    // Check if it's a startup username
    const { data: startup } = await supabase
      .from('startups')
      .select('*')
      .eq('username', cleanUsername)
      .single()

    if (startup) {
      if (mountedRef.current) setStartupData(startup)
      
      // Get owner profile
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', startup.user_id)
        .single()
      
      if (mountedRef.current) setProfileData(ownerProfile)
      await loadStartupPosts(startup)
      
      // Update cache
      profileCache.data[cleanUsername] = {
        profile: ownerProfile,
        startup,
        posts: profileCache.data[cleanUsername]?.posts || [],
        isFollowing: profileCache.data[cleanUsername]?.isFollowing || false,
        followersCount: profileCache.data[cleanUsername]?.followersCount || 0
      }
      profileCache.lastFetch[cleanUsername] = Date.now()
      
      if (mountedRef.current) setLoading(false)
      return
    }

    // Not found
    if (mountedRef.current) setLoading(false)
  }, [cleanUsername, user, supabase, loadStartupPosts])

  useEffect(() => {
    if (isInitialized && user) {
      loadProfile()
    }
  }, [isInitialized, user, loadProfile])

  const toggleFollow = async () => {
    if (!startupData || !user || !supabase) return
    
    try {
      if (isFollowing) {
        await supabase.from('follows').delete()
          .eq('user_id', user.id)
          .eq('startup_id', startupData.id)
        setFollowersCount(prev => prev - 1)
        
        // Delete follow notification
        await supabase.from('notifications').delete()
          .eq('user_id', startupData.user_id)
          .eq('actor_id', user.id)
          .eq('type', 'follow')
      } else {
        await supabase.from('follows').insert({
          user_id: user.id,
          startup_id: startupData.id
        })
        setFollowersCount(prev => prev + 1)
        
        // Create follow notification
        if (startupData.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: startupData.user_id,
            actor_id: user.id,
            type: 'follow'
          })
        }
      }
      setIsFollowing(!isFollowing)
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const startConversation = async () => {
    if (!profileData?.id || !user || !supabase) return

    try {
      const { data: existing1 } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', user.id)
        .eq('participant_2', profileData.id)
        .maybeSingle()

      const { data: existing2 } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', profileData.id)
        .eq('participant_2', user.id)
        .maybeSingle()

      const existing = existing1 || existing2

      if (existing) {
        router.push(`/messages?chat=${existing.id}`)
      } else {
        const { data: newConvo, error } = await supabase
          .from('conversations')
          .insert({
            participant_1: user.id,
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
  const isOwnProfile = user?.id === profileData?.id

  if (!isInitialized || loading) {
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
                  <Link 
                    href={`/u/${cleanUsername}/followers`}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <span className="font-semibold text-white">{followersCount}</span> followers
                  </Link>
                  <Link 
                    href={`/u/${cleanUsername}/following`}
                    className="hover:text-white transition-colors"
                  >
                    <span className="font-semibold text-white">{followingCount}</span> following
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Posts */}
            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUserId={user?.id}
                    onPostDelete={(postId) => {
                      setPosts(prev => prev.filter(p => p.id !== postId))
                      if (profileCache.data[cleanUsername]) {
                        profileCache.data[cleanUsername].posts = profileCache.data[cleanUsername].posts.filter(p => p.id !== postId)
                      }
                    }}
                  />
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
        <MobileNav />
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
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {profileData?.created_at ? formatDistanceToNow(new Date(profileData.created_at), { addSuffix: true }) : 'recently'}
                </span>
                <Link 
                  href={`/u/${cleanUsername}/following`}
                  className="hover:text-white transition-colors"
                >
                  <span className="font-semibold text-white">{followingCount}</span> Following
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
