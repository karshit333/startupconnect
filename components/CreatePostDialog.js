'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Image, X, Loader2, Globe } from 'lucide-react'
import { toast } from 'sonner'

export default function CreatePostDialog({ open, onOpenChange, startup, onPostCreated }) {
  const [content, setContent] = useState('')
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const fileInputRef = useRef(null)
  const supabase = createClient()

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    
    // Max 4 images total
    const remaining = 4 - images.length
    if (remaining <= 0) {
      toast.error('Maximum 4 images allowed')
      return
    }
    
    const filesToUpload = files.slice(0, remaining)
    setUploading(true)
    
    try {
      const uploadedUrls = []
      
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
        const filePath = `${startup.id}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, file)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath)
        
        uploadedUrls.push(publicUrl)
      }
      
      setImages(prev => [...prev, ...uploadedUrls])
      toast.success(`${uploadedUrls.length} image(s) uploaded`)
    } catch (error) {
      toast.error('Failed to upload images')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const createPost = async () => {
    // Safety check - prevent unapproved startups from posting
    const isApproved = startup?.is_approved === true || startup?.is_approved === 'true'
    if (!isApproved) {
      toast.error('Your startup must be approved before you can post')
      return
    }

    if (!content.trim() && images.length === 0) {
      toast.error('Please write something or add an image')
      return
    }

    setPosting(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          startup_id: startup.id,
          content: content.trim(),
          image_url: images[0] || null, // For backward compatibility
          images: images.length > 0 ? images : null,
        })
        .select(`
          *,
          startups (id, name, logo_url, domain, username)
        `)
        .single()

      if (error) throw error

      // Return post with empty arrays for new post
      onPostCreated?.({ ...data, likes: [], comments: [], likes_count: 0, user_has_liked: false })
      setContent('')
      setImages([])
      onOpenChange(false)
      toast.success('Post created!')
    } catch (error) {
      toast.error('Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  const getInitials = (name) => name?.slice(0, 2).toUpperCase() || 'S'

  // Grid layout for images preview
  const renderImageGrid = () => {
    if (images.length === 0) return null
    
    const gridClass = images.length === 1 ? 'grid-cols-1' :
                      images.length === 2 ? 'grid-cols-2' :
                      images.length === 3 ? 'grid-cols-2' : 'grid-cols-2'
    
    return (
      <div className={`grid ${gridClass} gap-1 rounded-lg overflow-hidden mt-3`}>
        {images.map((url, index) => (
          <div key={index} className={`relative ${images.length === 3 && index === 0 ? 'row-span-2' : ''}`}>
            <img
              src={url}
              alt=""
              className={`w-full object-cover ${images.length === 1 ? 'max-h-80' : 'h-40'}`}
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={startup?.logo_url} />
              <AvatarFallback className="bg-white/10">{getInitials(startup?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{startup?.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Anyone
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What would you like to share?"
            rows={4}
            className="bg-transparent border-0 resize-none text-base placeholder:text-muted-foreground focus-visible:ring-0 p-0"
          />
          
          {renderImageGrid()}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>
        
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= 4}
            className="text-muted-foreground hover:text-white"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Image className="h-5 w-5" />
            )}
            <span className="ml-2">{images.length}/4</span>
          </Button>
          
          <Button
            onClick={createPost}
            disabled={posting || (!content.trim() && images.length === 0)}
            className="bg-white text-background hover:bg-white/90"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
