'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import CreatePostDialog from '@/components/CreatePostDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, Users, Globe, Edit, Plus, CheckCircle, Clock, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function MyStartupPage() {
  const [startup, setStartup] = useState(null)
  const [posts, setPosts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [followersCount, setFollowersCount] = useState(0)
  const [postDialogOpen, setPostDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setCurrentUser(user)

    // Check if user is a startup
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'startup') {
      toast.error('This page is for startup accounts only')
      router.push('/feed')
      return
    }

    // Load startup
    const { data: startupData } = await supabase
      .from('startups')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setStartup(startupData)

    if (startupData) {
      // Load posts and followers count in parallel
      const [postsResult, followersResult] = await Promise.all([
        supabase.from('posts').select(`
          *,
          startups (id, name, logo_url, domain, username),
          likes (user_id),
          comments (id, content, created_at, user_id)
        `).eq('startup_id', startupData.id).order('created_at', { ascending: false }),
        supabase.from('follows').select('id', { count: 'exact' }).eq('startup_id', startupData.id)
      ])

      setFollowersCount(followersResult.count || 0)

      // Batch fetch comment author profiles
      const postsData = postsResult.data || []
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

      // Fetch saved posts status
      const postIds = postsData.map(p => p.id)
      let savedPostsSet = new Set()
      if (postIds.length > 0) {
        const { data: savedPosts } = await supabase
          .from('saved_posts')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds)
        
        savedPosts?.forEach(sp => savedPostsSet.add(sp.post_id))
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
      setPosts(processedPosts)
    }

    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePostCreated = (newPost) => {
    // Add post to local state immediately for instant feedback
    setPosts(prev => [{ ...newPost, user_has_saved: false }, ...prev])
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S'
  }

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
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">No startup found</h2>
              <p className="text-muted-foreground">Your startup profile hasn't been created yet.</p>
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
          {/* Startup Header */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-white/10 to-white/5" />
            <CardContent className="relative pb-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar className="h-28 w-28 border-4 border-card -mt-14 shadow-lg">
                  <AvatarImage src={startup.logo_url} />
                  <AvatarFallback className="text-3xl bg-white/10">
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
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Approval
                          </Badge>
                        )}
                      </div>
                      {startup.username && (
                        <p className="text-muted-foreground">@{startup.username}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <Badge className="bg-white/10">{startup.domain}</Badge>
                        {startup.stage && <Badge variant="outline" className="border-white/20">{startup.stage}</Badge>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-white/20">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
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
                    className="flex items-center gap-1 text-white hover:underline"
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

          {/* Posts Section */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Posts</CardTitle>
              <Button 
                size="sm" 
                disabled={!startup.is_approved}
                onClick={() => setPostDialogOpen(true)}
                className="bg-white text-background hover:bg-white/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </CardHeader>
            <CardContent>
              {!startup.is_approved && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <p className="text-yellow-500 text-sm">
                    Your startup is pending approval. Once approved, you'll be able to create posts.
                  </p>
                </div>
              )}
              {posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No posts yet. Create your first post!</p>
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

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        startup={startup}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}
