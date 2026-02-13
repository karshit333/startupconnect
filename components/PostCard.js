'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThumbsUp, MessageSquare, Share2, Send, MoreHorizontal, Globe } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

export default function PostCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(post.user_has_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState(post.comments || [])
  const [newComment, setNewComment] = useState('')
  const [loadingComment, setLoadingComment] = useState(false)
  const supabase = createClient()

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error('Please login to like posts')
      return
    }

    try {
      if (liked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
        setLikesCount(prev => prev - 1)
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId })
        setLikesCount(prev => prev + 1)
      }
      setLiked(!liked)
    } catch (error) {
      toast.error('Failed to update like')
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!currentUserId || !newComment.trim()) return

    setLoadingComment(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: post.id, user_id: currentUserId, content: newComment.trim() })
        .select('*, profiles:user_id (full_name, avatar_url)')
        .single()

      if (error) throw error
      setComments(prev => [...prev, data])
      setNewComment('')
    } catch (error) {
      toast.error('Failed to add comment')
    } finally {
      setLoadingComment(false)
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S'

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-start justify-between">
          <Link href={`/startup/${post.startup_id}`} className="flex items-start gap-3 group">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.startups?.logo_url} />
              <AvatarFallback className="bg-white/10">{getInitials(post.startups?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-semibold group-hover:underline">{post.startups?.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{post.startups?.domain}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                <Globe className="h-3 w-3" />
              </p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pt-3 pb-2">
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        {post.image_url && (
          <div className="mt-3 -mx-4 border-y border-border">
            <img src={post.image_url} alt="" className="w-full" />
          </div>
        )}
      </CardContent>

      {(likesCount > 0 || comments.length > 0) && (
        <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          {likesCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <ThumbsUp className="h-2.5 w-2.5" />
              </span>
              {likesCount}
            </span>
          )}
          {comments.length > 0 && (
            <button onClick={() => setShowComments(!showComments)} className="hover:underline">
              {comments.length} comments
            </button>
          )}
        </div>
      )}

      <div className="border-t border-border mx-4" />
      <CardFooter className="p-1 px-2">
        <div className="flex items-center w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex-1 h-10 gap-1 ${liked ? 'text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            <ThumbsUp className={`h-5 w-5 ${liked ? 'fill-white' : ''}`} strokeWidth={1.5} />
            <span className="text-xs">Like</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1 h-10 gap-1 text-muted-foreground hover:text-white"
          >
            <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs">Comment</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-10 gap-1 text-muted-foreground hover:text-white">
            <Share2 className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs">Share</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-10 gap-1 text-muted-foreground hover:text-white">
            <Send className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs">Send</span>
          </Button>
        </div>
      </CardFooter>

      {showComments && (
        <div className="px-4 pb-4 border-t border-border">
          <form onSubmit={handleComment} className="flex gap-2 py-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-white/10">U</AvatarFallback>
            </Avatar>
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={loadingComment}
              className="h-9 bg-secondary border-0 rounded-full text-sm"
            />
          </form>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs bg-white/10">{getInitials(comment.profiles?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="bg-secondary rounded-lg px-3 py-2">
                  <p className="text-sm font-semibold">{comment.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
