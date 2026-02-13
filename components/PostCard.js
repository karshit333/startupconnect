'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Heart, MessageCircle, Share2, Send, MoreHorizontal, Bookmark } from 'lucide-react'
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Link href={`/startup/${post.startup_id}`} className="flex items-center gap-3 group">
            <Avatar className="h-11 w-11">
              <AvatarImage src={post.startups?.logo_url} />
              <AvatarFallback className="bg-muted text-sm">{getInitials(post.startups?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-semibold group-hover:underline">{post.startups?.name}</h3>
              <p className="text-xs text-muted-foreground">
                {post.startups?.domain && <span className="capitalize">{post.startups.domain}</span>}
                <span className="mx-1">·</span>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
        {post.image_url && (
          <div className="mt-3 rounded-lg overflow-hidden border bg-muted">
            <img
              src={post.image_url}
              alt="Post image"
              className="w-full h-auto max-h-[400px] object-cover"
            />
          </div>
        )}
      </CardContent>

      {/* Stats */}
      <div className="px-6 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
        <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
      </div>

      <Separator />

      {/* Actions */}
      <CardFooter className="p-1">
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex-1 h-10 ${liked ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-current' : ''}`} />
            Like
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1 h-10 text-muted-foreground"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Comment
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-10 text-muted-foreground">
            <Bookmark className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </CardFooter>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 border-t">
          <div className="pt-3 space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(comment.profiles?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                  <p className="text-sm font-medium">{comment.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                </div>
              </div>
            ))}

            {/* Comment Input */}
            <form onSubmit={handleComment} className="flex gap-2 pt-2">
              <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={loadingComment}
                className="text-sm"
              />
              <Button type="submit" size="icon" disabled={loadingComment || !newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
