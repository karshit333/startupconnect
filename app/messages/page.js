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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Send, MessageSquare, Inbox, Clock, Check, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

function MessagesContent() {
  const searchParams = useSearchParams()
  const initialChatId = searchParams.get('chat')
  const [conversations, setConversations] = useState([])
  const [pendingConversations, setPendingConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [activeTab, setActiveTab] = useState('messages')
  const messagesEndRef = useRef(null)
  const router = useRouter()
  const supabase = createClient()

  const loadConversations = useCallback(async (user) => {
    // Load all conversations
    const { data: convosRaw } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (!convosRaw || convosRaw.length === 0) {
      setConversations([])
      setPendingConversations([])
      return []
    }

    // Get all participant IDs
    const participantIds = new Set()
    convosRaw.forEach(c => {
      if (c.participant_1 !== user.id) participantIds.add(c.participant_1)
      if (c.participant_2 !== user.id) participantIds.add(c.participant_2)
    })

    // Batch fetch all participant profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username')
      .in('id', Array.from(participantIds))

    const profilesMap = {}
    profiles?.forEach(p => { profilesMap[p.id] = p })

    // Get conversation IDs for batch queries
    const convoIds = convosRaw.map(c => c.id)

    // Batch fetch last messages for all conversations
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false })

    // Group messages by conversation and get last message
    const lastMessageByConvo = {}
    const unreadCountByConvo = {}
    
    allMessages?.forEach(msg => {
      if (!lastMessageByConvo[msg.conversation_id]) {
        lastMessageByConvo[msg.conversation_id] = msg
      }
      // Count unread messages (not from current user, not read)
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

    setConversations(accepted)
    setPendingConversations(pending)

    return processedConvos
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)

      const processedConvos = await loadConversations(user)

      // Handle initial chat selection
      if (initialChatId && processedConvos.length > 0) {
        const initialConvo = processedConvos.find(c => c.id === initialChatId)
        if (initialConvo) {
          setSelectedConvo(initialConvo)
          loadMessages(initialChatId, user)
          if (initialConvo.isPending) {
            setActiveTab('requests')
          }
        }
      }

      setLoading(false)
    }
    init()
  }, [initialChatId, loadConversations, router, supabase])

  const loadMessages = async (convoId, user = currentUser) => {
    if (!user) return
    
    const { data: messagesRaw } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true })
    
    if (!messagesRaw || messagesRaw.length === 0) {
      setMessages([])
      return
    }

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convoId)
      .neq('sender_id', user.id)

    // Batch fetch sender profiles
    const senderIds = [...new Set(messagesRaw.map(m => m.sender_id))]
    const { data: senderProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username')
      .in('id', senderIds)

    const profilesMap = {}
    senderProfiles?.forEach(p => { profilesMap[p.id] = p })

    const messagesWithSender = messagesRaw.map(msg => ({
      ...msg,
      sender: profilesMap[msg.sender_id] || null
    }))

    setMessages(messagesWithSender)
    scrollToBottom()

    // Update unread count in UI
    setConversations(prev => prev.map(c => 
      c.id === convoId ? { ...c, unreadCount: 0 } : c
    ))
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
      const { data: msgData, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConvo.id,
          sender_id: currentUser.id,
          content: newMessage.trim(),
        })
        .select()
        .single()

      if (error) throw error

      // Get sender profile
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .eq('id', currentUser.id)
        .single()

      const messageWithSender = { ...msgData, sender: senderProfile }
      setMessages(prev => [...prev, messageWithSender])
      setNewMessage('')

      // Update conversation - mark as accepted if responding to pending
      await supabase
        .from('conversations')
        .update({ 
          updated_at: new Date().toISOString(),
          is_accepted: true,
          last_message_preview: newMessage.trim().slice(0, 50)
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
    } finally {
      setSendingMessage(false)
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  const totalPending = pendingConversations.length

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
            {convo.lastMessage.sender_id === currentUser?.id && (
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <Card className="h-[calc(100vh-140px)] min-h-[500px] bg-card border-border">
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-border flex flex-col">
              <CardHeader className="pb-0 border-b border-border">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full bg-secondary">
                    <TabsTrigger value="messages" className="flex-1 gap-1 data-[state=active]:bg-white data-[state=active]:text-background">
                      <Inbox className="h-4 w-4" />
                      Messages
                      {totalUnread > 0 && (
                        <Badge className="ml-1 bg-white text-background h-5 px-1.5">{totalUnread}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="flex-1 gap-1 data-[state=active]:bg-white data-[state=active]:text-background">
                      <Clock className="h-4 w-4" />
                      Requests
                      {totalPending > 0 && (
                        <Badge className="ml-1 bg-yellow-500 text-background h-5 px-1.5">{totalPending}</Badge>
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
                    <div>
                      <p className="font-medium">{selectedConvo.otherParticipant?.full_name}</p>
                      {selectedConvo.otherParticipant?.username && (
                        <p className="text-xs text-muted-foreground">@{selectedConvo.otherParticipant.username}</p>
                      )}
                    </div>
                    {selectedConvo.isPending && (
                      <Badge variant="outline" className="ml-auto text-yellow-500 border-yellow-500">
                        Message Request
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
                            <div className={`flex items-center gap-1 mt-1 ${msg.sender_id === currentUser.id ? 'text-background/60' : 'text-muted-foreground'}`}>
                              <p className="text-xs">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                              {msg.sender_id === currentUser.id && (
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

                  <form onSubmit={sendMessage} className="p-4 border-t border-border flex gap-2">
                    <Input
                      placeholder={selectedConvo.isPending ? "Reply to accept..." : "Type a message..."}
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
