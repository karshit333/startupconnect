'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThumbsUp, MessageSquare, Share2, Send, MoreHorizontal, Bookmark, Globe } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

export default function PostCard({ post, currentUserId, onUpdate }) {
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
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId)
        setLikesCount(prev => prev - 1)
      } else {
        await supabase.from('likes').insert({
          post_id: post.id,
          user_id: currentUserId,
        })
        setLikesCount(prev => prev + 1)
      }
      setLiked(!liked)
    } catch (error) {
      toast.error('Failed to update like')
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!currentUserId) {
      toast.error('Please login to comment')
      return
    }
    if (!newComment.trim()) return

    setLoadingComment(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: newComment.trim(),
        })
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .single()

      if (error) throw error

      setComments(prev => [...prev, data])
      setNewComment('')
      toast.success('Comment added!')
    } catch (error) {
      toast.error('Failed to add comment')
    } finally {
      setLoadingComment(false)
    }
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S'
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-start justify-between">
          <Link href={`/startup/${post.startup_id}`} className="flex items-start gap-2 group">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.startups?.logo_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(post.startups?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-semibold group-hover:text-primary group-hover:underline leading-tight">{post.startups?.name}</h3>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5 capitalize">{post.startups?.domain}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                <span>·</span>
                <Globe className="h-3 w-3" />
              </p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pt-3 pb-2">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
        {post.image_url && (
          <div className="mt-3 -mx-4 border-y">
            <img
              src={post.image_url}
              alt="Post image"
              className="w-full h-auto"
            />
          </div>
        )}
      </CardContent>

      {/* Engagement Stats */}
      {(likesCount > 0 || comments.length > 0) && (
        <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          {likesCount > 0 && (
            <button className="flex items-center gap-1 hover:text-primary hover:underline" onClick={() => {}}>
              <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <ThumbsUp className="h-2.5 w-2.5 text-white" />
              </span>
              {likesCount}
            </button>
          )}
          {comments.length > 0 && (
            <button className="hover:text-primary hover:underline" onClick={() => setShowComments(!showComments)}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t mx-4" />
      <CardFooter className="p-1 px-2">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex-1 h-10 gap-1.5 ${liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ThumbsUp className={`h-5 w-5 ${liked ? 'fill-primary' : ''}`} strokeWidth={1.5} />
            <span className="text-xs font-semibold">Like</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1 h-10 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs font-semibold">Comment</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-10 gap-1.5 text-muted-foreground hover:text-foreground">
            <Share2 className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs font-semibold">Share</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-10 gap-1.5 text-muted-foreground hover:text-foreground">
            <Send className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs font-semibold">Send</span>
          </Button>
        </div>
      </CardFooter>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 border-t">
          {/* Comment Input */}
          <form onSubmit={handleComment} className="flex gap-2 py-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">U</AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={loadingComment}
                className="pr-10 rounded-full h-9 text-sm"
              />
              {newComment.trim() && (
                <Button 
                  type="submit" 
                  size="icon"
                  variant="ghost"
                  disabled={loadingComment}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-primary"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(comment.profiles?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-secondary rounded-lg px-3 py-2">
                  <p className="text-sm font-semibold">{comment.profiles?.full_name}</p>
                  <p className="text-sm text-foreground/90">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
