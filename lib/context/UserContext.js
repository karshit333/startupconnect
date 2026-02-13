'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [startup, setStartup] = useState(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [pendingMessages, setPendingMessages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Create a stable supabase client reference
  const supabaseRef = useRef(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  // Fetch unread message counts
  const refreshUnreadCounts = useCallback(async (userId) => {
    if (!userId) return

    try {
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, is_accepted, participant_1')
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)

      if (!convos || convos.length === 0) {
        setUnreadMessages(0)
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

      let totalUnread = unreadMsgs?.length || 0
      let pending = 0
      
      for (const convo of convos) {
        if (!convo.is_accepted && convo.participant_1 !== userId) {
          pending++
        }
      }
      
      setUnreadMessages(totalUnread)
      setPendingMessages(pending)
    } catch (error) {
      console.error('Error fetching unread counts:', error)
    }
  }, [supabase])

  // Initial load of user data
  const loadUserData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        setUser(null)
        setProfile(null)
        setStartup(null)
        setIsLoading(false)
        setIsInitialized(true)
        return
      }

      setUser(authUser)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setProfile(profileData)

      // If startup role, fetch startup
      if (profileData?.role === 'startup') {
        const { data: startupData } = await supabase
          .from('startups')
          .select('*')
          .eq('user_id', authUser.id)
          .single()
        setStartup(startupData)
      }

      // Fetch unread counts
      await refreshUnreadCounts(authUser.id)
      
      setIsLoading(false)
      setIsInitialized(true)
    } catch (error) {
      console.error('Error loading user data:', error)
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [supabase, refreshUnreadCounts])

  // Set up auth listener and real-time subscriptions
  useEffect(() => {
    // Load initial data
    loadUserData()

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setStartup(null)
          setUnreadMessages(0)
          setPendingMessages(0)
        } else if (event === 'SIGNED_IN' && session?.user) {
          loadUserData()
        }
      }
    )

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [loadUserData, supabase])

  // Set up real-time subscription for messages separately
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('global-messages-' + user.id)
      .on('postgres_changes', {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'messages'
      }, () => {
        // Refresh unread counts when any message changes
        refreshUnreadCounts(user.id)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase, refreshUnreadCounts])

  // Function to manually mark messages as read and update count
  const markMessagesAsRead = useCallback(async (conversationId) => {
    if (!user?.id) return

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)

    // Immediately refresh the count
    await refreshUnreadCounts(user.id)
  }, [user?.id, supabase, refreshUnreadCounts])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
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
    refreshUnreadCounts,
    markMessagesAsRead,
    signOut,
    reloadUserData: loadUserData
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
