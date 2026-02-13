'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThumbsUp, MessageSquare, Share2, Send, MoreHorizontal, Globe, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import ShareDialog from './ShareDialog'

export default function PostCard({ post, currentUserId, onPostUpdate }) {
  const [liked, setLiked] = useState(post.user_has_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [saved, setSaved] = useState(post.user_has_saved || false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState(post.comments || [])
  const [newComment, setNewComment] = useState('')
  const [loadingComment, setLoadingComment] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const supabase = createClient()

  // Get all images (support both old single image_url and new images array)
  const images = post.images?.length > 0 ? post.images : (post.image_url ? [post.image_url] : [])

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

  const handleSave = async () => {
    if (!currentUserId) {
      toast.error('Please login to save posts')
      return
    }

    try {
      if (saved) {
        await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', currentUserId)
        toast.success('Removed from saved')
      } else {
        await supabase.from('saved_posts').insert({ post_id: post.id, user_id: currentUserId })
        toast.success('Saved!')
      }
      setSaved(!saved)
    } catch (error) {
      toast.error('Failed to update')
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
        .select('*')
        .single()

      if (error) throw error
      
      // Fetch the profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, username')
        .eq('id', currentUserId)
        .single()
      
      setComments(prev => [...prev, { ...data, profiles: profileData }])
      setNewComment('')
    } catch (error) {
      toast.error('Failed to add comment')
    } finally {
      setLoadingComment(false)
    }
  }

  const deleteComment = async (commentId) => {
    try {
      await supabase.from('comments').delete().eq('id', commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      toast.success('Comment deleted')
    } catch (error) {
      toast.error('Failed to delete comment')
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S'

  // Parse @mentions in text
  const renderTextWithMentions = (text) => {
    if (!text) return null
    const parts = text.split(/(@[a-z0-9]+)/gi)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1)
        return (
          <Link key={i} href={`/u/${username}`} className="text-white font-medium hover:underline">
            {part}
          </Link>
        )
      }
      return part
    })
  }

  // Render image grid (LinkedIn style)
  const renderImageGrid = () => {
    if (images.length === 0) return null

    if (images.length === 1) {
      return (
        <div className="mt-3 -mx-4 border-y border-border">
          <img src={images[0]} alt="" className="w-full max-h-[500px] object-cover" />
        </div>
      )
    }

    if (images.length === 2) {
      return (
        <div className="mt-3 -mx-4 border-y border-border grid grid-cols-2 gap-0.5">
          {images.map((url, i) => (
            <img key={i} src={url} alt="" className="w-full h-64 object-cover" />
          ))}
        </div>
      )
    }

    if (images.length === 3) {
      return (
        <div className="mt-3 -mx-4 border-y border-border grid grid-cols-2 gap-0.5">
          <img src={images[0]} alt="" className="w-full h-64 object-cover row-span-2" />
          <img src={images[1]} alt="" className="w-full h-32 object-cover" />
          <img src={images[2]} alt="" className="w-full h-32 object-cover" />
        </div>
      )
    }

    // 4 images
    return (
      <div className="mt-3 -mx-4 border-y border-border grid grid-cols-2 gap-0.5">
        {images.map((url, i) => (
          <img key={i} src={url} alt="" className="w-full h-40 object-cover" />
        ))}
      </div>
    )
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex items-start justify-between">
            <Link href={post.startups?.username ? `/u/${post.startups.username}` : `/startup/${post.startup_id}`} className="flex items-start gap-3 group">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.startups?.logo_url} />
                <AvatarFallback className="bg-white/10">{getInitials(post.startups?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-semibold group-hover:underline">{post.startups?.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{post.startups?.domain}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'Just now'}
                  <Globe className="h-3 w-3" />
                </p>
              </div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={handleSave} className="cursor-pointer">
                  {saved ? <BookmarkCheck className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
                  {saved ? 'Unsave' : 'Save'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)} className="cursor-pointer">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 pt-3 pb-2">
          <p className="text-sm whitespace-pre-wrap">{renderTextWithMentions(post.content)}</p>
          {renderImageGrid()}
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
                {comments.length} comment{comments.length !== 1 ? 's' : ''}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
              className="flex-1 h-10 gap-1 text-muted-foreground hover:text-white"
            >
              <Share2 className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-xs">Share</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={`flex-1 h-10 gap-1 ${saved ? 'text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              {saved ? <BookmarkCheck className="h-5 w-5" strokeWidth={1.5} /> : <Bookmark className="h-5 w-5" strokeWidth={1.5} />}
              <span className="text-xs">Save</span>
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
                <div key={comment.id} className="flex gap-2 group">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs bg-white/10">{getInitials(comment.profiles?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-secondary rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          {comment.profiles?.full_name}
                          {comment.profiles?.username && (
                            <span className="font-normal text-muted-foreground ml-1">@{comment.profiles.username}</span>
                          )}
                        </p>
                        {comment.user_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{renderTextWithMentions(comment.content)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-3">
                      {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : 'Just now'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} post={post} />
    </>
  )
}
