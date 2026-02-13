'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Building2, MapPin, Users, Globe, Edit, Plus, Image, Loader2, CheckCircle, Clock, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function MyStartupPage() {
  const [startup, setStartup] = useState(null)
  const [posts, setPosts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [followersCount, setFollowersCount] = useState(0)
  const [postDialogOpen, setPostDialogOpen] = useState(false)
  const [newPost, setNewPost] = useState({ content: '', image_url: '' })
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
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
          .eq('startup_id', startupData.id)
          .order('created_at', { ascending: false })

        const processedPosts = postsData?.map(post => ({
          ...post,
          likes_count: post.likes?.length || 0,
          user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
        })) || []
        setPosts(processedPosts)

        // Get followers count
        const { count } = await supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('startup_id', startupData.id)
        setFollowersCount(count || 0)
      }

      setLoading(false)
    }
    init()
  }, [router, supabase])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${startup.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath)

      setNewPost({ ...newPost, image_url: publicUrl })
      toast.success('Image uploaded!')
    } catch (error) {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const createPost = async () => {
    if (!newPost.content.trim()) {
      toast.error('Please write something')
      return
    }

    setPosting(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          startup_id: startup.id,
          content: newPost.content.trim(),
          image_url: newPost.image_url || null,
        })
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
        .single()

      if (error) throw error

      setPosts(prev => [{ ...data, likes_count: 0, user_has_liked: false }, ...prev])
      setNewPost({ content: '', image_url: '' })
      setPostDialogOpen(false)
      toast.success('Post created!')
    } catch (error) {
      toast.error('Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S'
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
                            Pending Approval
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge>{startup.domain}</Badge>
                        {startup.stage && <Badge variant="outline">{startup.stage}</Badge>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
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

          {/* Posts Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Posts</CardTitle>
              <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!startup.is_approved}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a Post</DialogTitle>
                    <DialogDescription>
                      Share updates, announcements, or job openings with your followers
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        value={newPost.content}
                        onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                        placeholder="What would you like to share?"
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image (optional)</Label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      {newPost.image_url ? (
                        <div className="relative">
                          <img
                            src={newPost.image_url}
                            alt="Post preview"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setNewPost({ ...newPost, image_url: '' })}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Image className="h-4 w-4 mr-2" />
                          )}
                          Upload Image
                        </Button>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPostDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createPost} disabled={posting}>
                      {posting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Post
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!startup.is_approved && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm">
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
    </div>
  )
}
