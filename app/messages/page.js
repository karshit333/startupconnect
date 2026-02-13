'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function MessagesContent() {
  const searchParams = useSearchParams()
  const initialChatId = searchParams.get('chat')
  const [conversations, setConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef(null)
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

      // Load conversations - use simpler query first
      const { data: convosRaw, error: convosError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (convosError) {
        console.error('Error loading conversations:', convosError)
      }

      // Fetch profile data separately for each conversation
      const processedConvos = await Promise.all((convosRaw || []).map(async (convo) => {
        const otherParticipantId = convo.participant_1 === user.id 
          ? convo.participant_2 
          : convo.participant_1
        
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', otherParticipantId)
          .single()

        return { ...convo, otherParticipant: otherProfile }
      }))

      setConversations(processedConvos)

      if (initialChatId) {
        const initialConvo = processedConvos.find(c => c.id === initialChatId)
        if (initialConvo) {
          setSelectedConvo(initialConvo)
          loadMessages(initialChatId)
        }
      }

      setLoading(false)
    }
    init()
  }, [])

  const loadMessages = async (convoId) => {
    const { data } = await supabase
      .from('messages')
      .select(`*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)`)
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    scrollToBottom()
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const selectConversation = (convo) => {
    setSelectedConvo(convo)
    loadMessages(convo.id)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConvo) return

    setSendingMessage(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConvo.id,
          sender_id: currentUser.id,
          content: newMessage.trim(),
        })
        .select(`*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)`)
        .single()

      if (error) throw error

      setMessages(prev => [...prev, data])
      setNewMessage('')

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConvo.id)

      scrollToBottom()
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="bg-card rounded-lg border border-border h-[600px] skeleton" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <Card className="h-[calc(100vh-140px)] min-h-[500px] bg-card border-border">
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-border flex flex-col">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Start messaging startups!</p>
                  </div>
                ) : (
                  conversations.map((convo) => (
                    <div
                      key={convo.id}
                      onClick={() => selectConversation(convo)}
                      className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-border ${
                        selectedConvo?.id === convo.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={convo.otherParticipant?.avatar_url} />
                        <AvatarFallback className="bg-white/10">
                          {getInitials(convo.otherParticipant?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {convo.otherParticipant?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedConvo ? (
                <>
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedConvo.otherParticipant?.avatar_url} />
                      <AvatarFallback className="bg-white/10">
                        {getInitials(selectedConvo.otherParticipant?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{selectedConvo.otherParticipant?.full_name}</p>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.sender_id !== currentUser.id && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.sender?.avatar_url} />
                              <AvatarFallback className="text-xs bg-white/10">
                                {getInitials(msg.sender?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.sender_id === currentUser.id
                                ? 'bg-white text-background'
                                : 'bg-secondary'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${msg.sender_id === currentUser.id ? 'text-background/60' : 'text-muted-foreground'}`}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <form onSubmit={sendMessage} className="p-4 border-t border-border flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sendingMessage}
                      className="bg-secondary border-0"
                    />
                    <Button type="submit" disabled={sendingMessage || !newMessage.trim()} className="bg-white text-background hover:bg-white/90">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 skeleton rounded" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
