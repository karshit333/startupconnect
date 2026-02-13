'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const UserContext = createContext(null)

// Cache for preventing redundant fetches
const cache = {
  user: null,
  profile: null,
  startup: null,
  unreadCount: 0,
  pendingCount: 0,
  lastFetch: 0
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(cache.user)
  const [profile, setProfile] = useState(cache.profile)
  const [startup, setStartup] = useState(cache.startup)
  const [unreadMessages, setUnreadMessages] = useState(cache.unreadCount)
  const [pendingMessages, setPendingMessages] = useState(cache.pendingCount)
  const [isLoading, setIsLoading] = useState(!cache.user)
  const [isInitialized, setIsInitialized] = useState(!!cache.user)
  
  const supabaseRef = useRef(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  // Optimistic update for unread count - instant UI update
  const setUnreadCountOptimistic = useCallback((count) => {
    cache.unreadCount = count
    setUnreadMessages(count)
  }, [])

  // Fetch unread message counts
  const refreshUnreadCounts = useCallback(async (userId) => {
    if (!userId) return

    try {
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, is_accepted, participant_1')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)

      if (!convos || convos.length === 0) {
        setUnreadCountOptimistic(0)
        cache.pendingCount = 0
        setPendingMessages(0)
        return
      }

      const convoIds = convos.map(c => c.id)
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('conversation_id')
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
      
      setUnreadCountOptimistic(totalUnread)
      cache.pendingCount = pending
      setPendingMessages(pending)
    } catch (error) {
      console.error('Error fetching unread counts:', error)
    }
  }, [supabase, setUnreadCountOptimistic])

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

      await refreshUnreadCounts(authUser.id)
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

  // Real-time subscription for messages
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('global-messages-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        refreshUnreadCounts(user.id)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase, refreshUnreadCounts])

  // INSTANT mark messages as read - optimistic update
  const markMessagesAsRead = useCallback(async (conversationId) => {
    if (!user?.id) return

    // OPTIMISTIC: Immediately set to 0 before DB update
    const previousCount = unreadMessages
    setUnreadCountOptimistic(0)

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)

      // Refresh to get accurate count
      await refreshUnreadCounts(user.id)
    } catch (error) {
      // Rollback on error
      setUnreadCountOptimistic(previousCount)
      console.error('Error marking messages as read:', error)
    }
  }, [user?.id, supabase, refreshUnreadCounts, unreadMessages, setUnreadCountOptimistic])

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
    refreshUnreadCounts: () => refreshUnreadCounts(user?.id),
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
