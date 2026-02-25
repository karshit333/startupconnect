'use client'

import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import { Card, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Send, MessageSquare, Inbox, Clock, Check, CheckCheck, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

// Module-level cache for conversations - persists across navigations
const messagesCache = {
  conversations: [],
  pending: [],
  lastFetch: 0,
  profilesMap: {}
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const initialChatId = searchParams.get('chat')
  const { user, supabase, isInitialized, markMessagesAsRead } = useUser()
  
  // Initialize with cached data for INSTANT display
  const [conversations, setConversations] = useState(messagesCache.conversations)
  const [pendingConversations, setPendingConversations] = useState(messagesCache.pending)
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(messagesCache.conversations.length === 0)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [activeTab, setActiveTab] = useState('messages')
  const messagesEndRef = useRef(null)
  const router = useRouter()
  const fetchingRef = useRef(false)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Redirect if not logged in
  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/auth/login')
    }
  }, [isInitialized, user, router])

  // OPTIMIZED: Load conversations with aggressive caching
  const loadConversations = useCallback(async (forceRefresh = false) => {
    if (!user || !supabase) return []
    if (fetchingRef.current) return messagesCache.conversations.concat(messagesCache.pending)
    
    // Use cache if recent (within 15 seconds)
    const now = Date.now()
    if (!forceRefresh && messagesCache.conversations.length > 0 && (now - messagesCache.lastFetch) < 15000) {
      return messagesCache.conversations.concat(messagesCache.pending)
    }

    fetchingRef.current = true

    try {
      // OPTIMIZED: Fetch conversations
      const { data: convosRaw } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (!convosRaw || convosRaw.length === 0) {
        messagesCache.conversations = []
        messagesCache.pending = []
        messagesCache.lastFetch = Date.now()
        if (mountedRef.current) {
          setConversations([])
          setPendingConversations([])
        }
        return []
      }

      // Get all participant IDs
      const participantIds = new Set()
      convosRaw.forEach(c => {
        if (c.participant_1 !== user.id) participantIds.add(c.participant_1)
        if (c.participant_2 !== user.id) participantIds.add(c.participant_2)
      })

      const convoIds = convosRaw.map(c => c.id)

      // OPTIMIZED: Parallel fetch for profiles and messages
      const [profilesResult, messagesResult] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', Array.from(participantIds)),
        supabase.from('messages').select('*').in('conversation_id', convoIds).order('created_at', { ascending: false })
      ])

      if (!mountedRef.current) return []

      const profilesMap = {}
      profilesResult.data?.forEach(p => { profilesMap[p.id] = p })
      messagesCache.profilesMap = { ...messagesCache.profilesMap, ...profilesMap }

      // Group messages by conversation
      const lastMessageByConvo = {}
      const unreadCountByConvo = {}
      
      messagesResult.data?.forEach(msg => {
        if (!lastMessageByConvo[msg.conversation_id]) {
          lastMessageByConvo[msg.conversation_id] = msg
        }
        if (msg.sender_id !== user.id && !msg.is_read) {
          unreadCountByConvo[msg.conversation_id] = (unreadCountByConvo[msg.conversation_id] || 0) + 1
        }
      })

      // Process conversations
      const processedConvos = convosRaw.map(convo => {
        const isParticipant1 = convo.participant_1 === user.id
        const otherParticipantId = isParticipant1 ? convo.participant_2 : convo.participant_1
        const isPending = !convo.is_accepted && convo.participant_1 !== user.id

        return {
          ...convo,
          otherParticipant: profilesMap[otherParticipantId] || null,
          lastMessage: lastMessageByConvo[convo.id] || null,
          unreadCount: unreadCountByConvo[convo.id] || 0,
          isPending
        }
      })

      // Split into accepted and pending
      const accepted = processedConvos.filter(c => !c.isPending)
      const pending = processedConvos.filter(c => c.isPending)

      // Update cache
      messagesCache.conversations = accepted
      messagesCache.pending = pending
      messagesCache.lastFetch = Date.now()

      if (mountedRef.current) {
        setConversations(accepted)
        setPendingConversations(pending)
      }

      return processedConvos
    } finally {
      fetchingRef.current = false
    }
  }, [user, supabase])

  // Initial load
  useEffect(() => {
    async function init() {
      if (!isInitialized || !user) return

      const processedConvos = await loadConversations()

      // Handle initial chat selection
      if (initialChatId && processedConvos.length > 0) {
        const initialConvo = processedConvos.find(c => c.id === initialChatId)
        if (initialConvo) {
          setSelectedConvo(initialConvo)
          await loadMessages(initialChatId)
          if (initialConvo.isPending) {
            setActiveTab('requests')
          }
        }
      }

      if (mountedRef.current) setLoading(false)
    }
    init()
  }, [isInitialized, user, initialChatId, loadConversations])

  // OPTIMIZED: Load messages for a conversation
  const loadMessages = async (convoId) => {
    if (!user || !supabase) return
    
    // FIRST: Mark messages as read IMMEDIATELY - this updates navbar badge
    await markMessagesAsRead(convoId)
    
    // Update local conversation unread count to 0 IMMEDIATELY
    setConversations(prev => prev.map(c => 
      c.id === convoId ? { ...c, unreadCount: 0 } : c
    ))
    // Also update cache
    messagesCache.conversations = messagesCache.conversations.map(c =>
      c.id === convoId ? { ...c, unreadCount: 0 } : c
    )
    
    const { data: messagesRaw } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true })
    
    if (!messagesRaw || messagesRaw.length === 0) {
      if (mountedRef.current) setMessages([])
      return
    }

    // Use cached profiles if available, otherwise fetch
    const senderIds = [...new Set(messagesRaw.map(m => m.sender_id))]
    const missingIds = senderIds.filter(id => !messagesCache.profilesMap[id])
    
    if (missingIds.length > 0) {
      const { data: newProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', missingIds)
      
      newProfiles?.forEach(p => { messagesCache.profilesMap[p.id] = p })
    }

    const messagesWithSender = messagesRaw.map(msg => ({
      ...msg,
      sender: messagesCache.profilesMap[msg.sender_id] || null
    }))

    if (mountedRef.current) {
      setMessages(messagesWithSender)
    }
    
    scrollToBottom()
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const selectConversation = async (convo) => {
    setSelectedConvo(convo)
    await loadMessages(convo.id)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConvo || !user || !supabase) return

    setSendingMessage(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    try {
      const { data: msgData, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConvo.id,
          sender_id: user.id,
          content: messageContent,
        })
        .select()
        .single()

      if (error) throw error

      // Get sender profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .eq('id', user.id)
        .single()

      const messageWithSender = { ...msgData, sender: senderProfile }
      setMessages(prev => [...prev, messageWithSender])

      // Update conversation
      await supabase
        .from('conversations')
        .update({ 
          updated_at: new Date().toISOString(),
          is_accepted: true,
          last_message_preview: messageContent.slice(0, 50)
        })
        .eq('id', selectedConvo.id)

      // Move from pending to accepted if necessary
      if (selectedConvo.isPending) {
        setPendingConversations(prev => prev.filter(c => c.id !== selectedConvo.id))
        setConversations(prev => [{ ...selectedConvo, isPending: false, is_accepted: true }, ...prev])
        setSelectedConvo({ ...selectedConvo, isPending: false, is_accepted: true })
      }

      scrollToBottom()
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setSendingMessage(false)
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  const totalPending = pendingConversations.length

  // Show skeleton only if no cached data
  if (!isInitialized || (loading && conversations.length === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="bg-card rounded-lg border border-border h-[600px] flex">
            <div className="w-80 border-r border-border">
              <div className="p-4 space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded" />)}
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 opacity-50" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ConversationItem = ({ convo, isSelected }) => (
    <div
      onClick={() => selectConversation(convo)}
      className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-border ${
        isSelected ? 'bg-white/10' : ''
      }`}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage src={convo.otherParticipant?.avatar_url} />
          <AvatarFallback className="bg-white/10">
            {getInitials(convo.otherParticipant?.full_name)}
          </AvatarFallback>
        </Avatar>
        {convo.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-background text-xs font-bold rounded-full flex items-center justify-center">
            {convo.unreadCount}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`font-medium truncate ${convo.unreadCount > 0 ? 'text-white' : ''}`}>
            {convo.otherParticipant?.full_name || 'Unknown'}
          </p>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: false })}
          </span>
        </div>
        {convo.otherParticipant?.username && (
          <p className="text-xs text-muted-foreground">@{convo.otherParticipant.username}</p>
        )}
        {convo.lastMessage && (
          <p className={`text-sm truncate mt-0.5 ${convo.unreadCount > 0 ? 'text-white/80' : 'text-muted-foreground'}`}>
            {convo.lastMessage.sender_id === user?.id && (
              <span className="inline-flex items-center mr-1">
                {convo.lastMessage.is_read ? (
                  <CheckCheck className="h-3 w-3 text-white" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
            {convo.lastMessage.content}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-0 md:px-4 py-0 md:py-6">
        <Card className="h-[calc(100vh-64px)] md:h-[calc(100vh-140px)] min-h-[400px] bg-card border-0 md:border md:border-border rounded-none md:rounded-lg">
          <div className="flex h-full relative">
            {/* Conversations List - Full width on mobile, fixed width on desktop */}
            <div className={`${selectedConvo ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r-0 md:border-r border-border flex-col`}>
              <CardHeader className="pb-0 border-b border-border px-3 md:px-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full bg-secondary">
                    <TabsTrigger value="messages" className="flex-1 gap-1 text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-background">
                      <Inbox className="h-4 w-4" />
                      <span className="hidden sm:inline">Messages</span>
                      <span className="sm:hidden">Inbox</span>
                      {totalUnread > 0 && (
                        <Badge className="ml-1 bg-white text-background h-5 px-1.5 text-xs">{totalUnread}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="flex-1 gap-1 text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-background">
                      <Clock className="h-4 w-4" />
                      Requests
                      {totalPending > 0 && (
                        <Badge className="ml-1 bg-yellow-500 text-background h-5 px-1.5 text-xs">{totalPending}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <ScrollArea className="flex-1">
                {activeTab === 'messages' ? (
                  conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No conversations yet</p>
                      <p className="text-sm mt-1">Start messaging startups!</p>
                    </div>
                  ) : (
                    conversations.map((convo) => (
                      <ConversationItem 
                        key={convo.id} 
                        convo={convo} 
                        isSelected={selectedConvo?.id === convo.id}
                      />
                    ))
                  )
                ) : (
                  pendingConversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No message requests</p>
                    </div>
                  ) : (
                    pendingConversations.map((convo) => (
                      <ConversationItem 
                        key={convo.id} 
                        convo={convo} 
                        isSelected={selectedConvo?.id === convo.id}
                      />
                    ))
                  )
                )}
              </ScrollArea>
            </div>

            {/* Messages Area - Full screen overlay on mobile */}
            <div className={`${selectedConvo ? 'flex' : 'hidden md:flex'} flex-1 flex-col absolute md:relative inset-0 md:inset-auto bg-card z-10`}>
              {selectedConvo ? (
                <>
                  <div className="p-3 md:p-4 border-b border-border flex items-center gap-3">
                    {/* Back button - mobile only */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8 shrink-0"
                      onClick={() => setSelectedConvo(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={selectedConvo.otherParticipant?.avatar_url} />
                      <AvatarFallback className="bg-white/10">
                        {getInitials(selectedConvo.otherParticipant?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedConvo.otherParticipant?.full_name}</p>
                      {selectedConvo.otherParticipant?.username && (
                        <p className="text-xs text-muted-foreground">@{selectedConvo.otherParticipant.username}</p>
                      )}
                    </div>
                    {selectedConvo.isPending && (
                      <Badge variant="outline" className="shrink-0 text-yellow-500 border-yellow-500 text-xs">
                        Request
                      </Badge>
                    )}
                  </div>

                  {selectedConvo.isPending && messages.length > 0 && (
                    <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
                      <p className="text-sm text-yellow-500">
                        This is a message request. Reply to accept the conversation.
                      </p>
                    </div>
                  )}

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.sender_id !== user?.id && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.sender?.avatar_url} />
                              <AvatarFallback className="text-xs bg-white/10">
                                {getInitials(msg.sender?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.sender_id === user?.id
                                ? 'bg-white text-background'
                                : 'bg-secondary'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 ${msg.sender_id === user?.id ? 'text-background/60' : 'text-muted-foreground'}`}>
                              <p className="text-xs">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                              {msg.sender_id === user?.id && (
                                msg.is_read ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-border flex gap-2 mb-16 md:mb-0">
                    <Input
                      placeholder={selectedConvo.isPending ? "Reply to accept..." : "Type a message..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sendingMessage}
                      className="bg-secondary border-0 h-11"
                    />
                    <Button type="submit" disabled={sendingMessage || !newMessage.trim()} className="bg-white text-background hover:bg-white/90 h-11 px-4">
                      <Send className="h-5 w-5" />
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
      <MobileNav />
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center pb-20 md:pb-0">
        <div className="w-10 h-10 skeleton rounded" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
