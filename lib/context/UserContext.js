'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const UserContext = createContext(null)

// Singleton cache - persists across re-renders but not page refreshes
const cache = {
  user: null,
  profile: null,
  startup: null,
  unreadCount: 0,
  pendingCount: 0,
  lastFetch: 0,
  markedConversations: new Set() // Track recently marked conversations
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(cache.user)
  const [profile, setProfile] = useState(cache.profile)
  const [startup, setStartup] = useState(cache.startup)
  const [unreadMessages, setUnreadMessages] = useState(cache.unreadCount)
  const [pendingMessages, setPendingMessages] = useState(cache.pendingCount)
  const [isLoading, setIsLoading] = useState(!cache.user)
  const [isInitialized, setIsInitialized] = useState(!!cache.user)
  
  // Use a counter to track ongoing mark operations
  const markOperationsRef = useRef(0)
  
  const supabaseRef = useRef(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  // Direct state update for unread count - IMMEDIATE
  const setUnreadImmediate = useCallback((count) => {
    const newCount = Math.max(0, count)
    cache.unreadCount = newCount
    setUnreadMessages(newCount)
  }, [])

  // Fetch unread message counts from database - DEBOUNCED
  const refreshUnreadCounts = useCallback(async (userId, force = false) => {
    // CRITICAL: Skip refresh if ANY mark operation is in progress
    if (!force && markOperationsRef.current > 0) {
      return
    }
    
    if (!userId) return

    try {
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, is_accepted, participant_1')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)

      if (!convos || convos.length === 0) {
        setUnreadImmediate(0)
        cache.pendingCount = 0
        setPendingMessages(0)
        return
      }

      const convoIds = convos.map(c => c.id)
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('id')
        .in('conversation_id', convoIds)
        .neq('sender_id', userId)
        .eq('is_read', false)

      const totalUnread = unreadMsgs?.length || 0
      let pending = 0
      
      for (const convo of convos) {
        if (!convo.is_accepted && convo.participant_1 !== userId) {
          pending++
        }
      }
      
      // Only update if no mark operations started during fetch
      if (markOperationsRef.current === 0) {
        setUnreadImmediate(totalUnread)
        cache.pendingCount = pending
        setPendingMessages(pending)
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error)
    }
  }, [supabase, setUnreadImmediate])

  // Initial load of user data - with caching
  const loadUserData = useCallback(async (forceRefresh = false) => {
    // Use cache if recently fetched (within 5 seconds)
    const now = Date.now()
    if (!forceRefresh && cache.user && (now - cache.lastFetch) < 5000) {
      setUser(cache.user)
      setProfile(cache.profile)
      setStartup(cache.startup)
      setUnreadMessages(cache.unreadCount)
      setPendingMessages(cache.pendingCount)
      setIsLoading(false)
      setIsInitialized(true)
      return
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        cache.user = null
        cache.profile = null
        cache.startup = null
        setUser(null)
        setProfile(null)
        setStartup(null)
        setIsLoading(false)
        setIsInitialized(true)
        return
      }

      cache.user = authUser
      setUser(authUser)

      // Fetch profile and startup in parallel
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      cache.profile = profileData
      setProfile(profileData)

      if (profileData?.role === 'startup') {
        const { data: startupData } = await supabase
          .from('startups')
          .select('*')
          .eq('user_id', authUser.id)
          .single()
        cache.startup = startupData
        setStartup(startupData)
      }

      await refreshUnreadCounts(authUser.id, true)
      cache.lastFetch = Date.now()
      
      setIsLoading(false)
      setIsInitialized(true)
    } catch (error) {
      console.error('Error loading user data:', error)
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [supabase, refreshUnreadCounts])

  useEffect(() => {
    loadUserData()

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          cache.user = null
          cache.profile = null
          cache.startup = null
          cache.unreadCount = 0
          cache.pendingCount = 0
          cache.markedConversations.clear()
          setUser(null)
          setProfile(null)
          setStartup(null)
          setUnreadMessages(0)
          setPendingMessages(0)
        } else if (event === 'SIGNED_IN' && session?.user) {
          loadUserData(true)
        }
      }
    )

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [loadUserData, supabase])

  // Real-time subscription for NEW messages only - increment count directly
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('new-messages-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, async (payload) => {
        // Only care about messages sent TO us (not FROM us)
        if (payload.new && payload.new.sender_id !== user.id) {
          // Check if this conversation involves us before incrementing
          const { data: convo } = await supabase
            .from('conversations')
            .select('participant_1, participant_2')
            .eq('id', payload.new.conversation_id)
            .single()
          
          if (convo && (convo.participant_1 === user.id || convo.participant_2 === user.id)) {
            // Skip if this conversation was recently marked as read
            if (cache.markedConversations.has(payload.new.conversation_id)) {
              return
            }
            // Increment the count directly - no database fetch
            setUnreadImmediate(cache.unreadCount + 1)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase, setUnreadImmediate])

  // Mark messages as read - SYNCHRONOUS optimistic update
  const markMessagesAsRead = useCallback(async (conversationId) => {
    if (!user?.id) return

    // Set flag to prevent real-time from overriding
    isMarkingAsReadRef.current = true

    try {
      // First, count how many unread messages are in this conversation
      const { data: unreadInConvo } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false)

      const countInConvo = unreadInConvo?.length || 0
      
      if (countInConvo === 0) {
        isMarkingAsReadRef.current = false
        return // Nothing to mark as read
      }

      // Calculate new total
      const currentTotal = cache.unreadCount
      const newTotal = Math.max(0, currentTotal - countInConvo)

      // Update database FIRST
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking messages as read:', error)
        isMarkingAsReadRef.current = false
        return
      }

      // Update cache and state AFTER successful DB update
      cache.unreadCount = newTotal
      setUnreadMessages(newTotal)
      
      // Small delay before allowing real-time updates again
      setTimeout(() => {
        isMarkingAsReadRef.current = false
      }, 500)

    } catch (error) {
      console.error('Error in markMessagesAsRead:', error)
      isMarkingAsReadRef.current = false
    }
  }, [user?.id, supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    cache.user = null
    cache.profile = null
    cache.startup = null
    cache.unreadCount = 0
    cache.pendingCount = 0
    setUser(null)
    setProfile(null)
    setStartup(null)
    setUnreadMessages(0)
    setPendingMessages(0)
  }, [supabase])

  const value = {
    user,
    profile,
    startup,
    unreadMessages,
    pendingMessages,
    isLoading,
    isInitialized,
    supabase,
    refreshUnreadCounts: () => refreshUnreadCounts(user?.id, true),
    markMessagesAsRead,
    signOut,
    reloadUserData: () => loadUserData(true)
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
