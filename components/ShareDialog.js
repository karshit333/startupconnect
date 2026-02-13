'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Link2, Send, MessageSquare, Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export default function ShareDialog({ open, onOpenChange, post }) {
  const [copied, setCopied] = useState(false)
  const [conversations, setConversations] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const postUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/post/${post?.id}` 
    : ''

  useEffect(() => {
    async function loadConversations() {
      if (!open) return
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUser(user)

      const { data: convos } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(10)

      const processedConvos = await Promise.all((convos || []).map(async (convo) => {
        const otherParticipantId = convo.participant_1 === user.id 
          ? convo.participant_2 
          : convo.participant_1
        
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .eq('id', otherParticipantId)
          .single()

        return { ...convo, otherParticipant: otherProfile }
      }))

      setConversations(processedConvos)
      setLoading(false)
    }
    loadConversations()
  }, [open])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  const shareToConversation = async (convo) => {
    try {
      const message = `Check out this post: ${postUrl}`
      
      await supabase.from('messages').insert({
        conversation_id: convo.id,
        sender_id: currentUser.id,
        content: message,
      })

      await supabase.from('conversations').update({
        updated_at: new Date().toISOString(),
        last_message_preview: message.slice(0, 50)
      }).eq('id', convo.id)

      toast.success(`Shared with ${convo.otherParticipant?.full_name}`)
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to share')
    }
  }

  const shareExternal = (platform) => {
    const text = encodeURIComponent(post?.content?.slice(0, 100) || 'Check out this post')
    const url = encodeURIComponent(postUrl)
    
    const links = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    }
    
    window.open(links[platform], '_blank', 'width=600,height=400')
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        
        {/* Copy Link */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={postUrl}
              readOnly
              className="bg-secondary border-0 text-sm"
            />
            <Button onClick={copyLink} variant="outline" className="border-white/20 shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* External Share */}
          <div className="flex justify-center gap-4 py-2">
            <button
              onClick={() => shareExternal('whatsapp')}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-xs">WhatsApp</span>
            </button>
            <button
              onClick={() => shareExternal('twitter')}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-xs">X</span>
            </button>
            <button
              onClick={() => shareExternal('linkedin')}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <span className="text-xs">LinkedIn</span>
            </button>
            <button
              onClick={() => shareExternal('telegram')}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-white transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <span className="text-xs">Telegram</span>
            </button>
          </div>

          {/* Send to users */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Send in message
            </p>
            <ScrollArea className="h-48">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 skeleton rounded-lg" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet
                </p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((convo) => (
                    <button
                      key={convo.id}
                      onClick={() => shareToConversation(convo)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={convo.otherParticipant?.avatar_url} />
                        <AvatarFallback className="bg-white/10">
                          {getInitials(convo.otherParticipant?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{convo.otherParticipant?.full_name}</p>
                        {convo.otherParticipant?.username && (
                          <p className="text-xs text-muted-foreground">@{convo.otherParticipant.username}</p>
                        )}
                      </div>
                      <Send className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
