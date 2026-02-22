'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import PostCard from '@/components/PostCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bookmark } from 'lucide-react'
import Link from 'next/link'

export default function SavedPage() {
  const [savedPosts, setSavedPosts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadSavedPosts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)

      // Get saved post IDs
      const { data: savedData } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (savedData && savedData.length > 0) {
        const postIds = savedData.map(s => s.post_id)
        
        // Fetch the actual posts
        const { data: postsData } = await supabase
          .from('posts')
          .select(`
            *,
            startups (id, name, logo_url, domain, username),
            likes (user_id),
            comments (id, content, created_at, user_id)
          `)
          .in('id', postIds)

        // Fetch profiles for comments
        const processedPosts = await Promise.all((postsData || []).map(async (post) => {
          const commentUserIds = [...new Set(post.comments?.map(c => c.user_id) || [])]
          
          let profilesMap = {}
          if (commentUserIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, username')
              .in('id', commentUserIds)
            
            profiles?.forEach(p => { profilesMap[p.id] = p })
          }

          const commentsWithProfiles = post.comments?.map(comment => ({
            ...comment,
            profiles: profilesMap[comment.user_id] || null
          })) || []

          return {
            ...post,
            comments: commentsWithProfiles,
            likes_count: post.likes?.length || 0,
            user_has_liked: post.likes?.some(like => like.user_id === user.id) || false,
            user_has_saved: true,
          }
        }))

        setSavedPosts(processedPosts)
      }

      setLoading(false)
    }
    loadSavedPosts()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-lg border border-border h-48 skeleton" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Bookmark className="h-6 w-6" />
              Saved Items
            </h1>
            <p className="text-muted-foreground text-sm">Posts you've saved</p>
          </div>

          {savedPosts.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No saved posts</h3>
                <p className="text-sm text-muted-foreground">
                  Save posts to view them later
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {savedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUser?.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
