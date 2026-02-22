'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Heart, MessageSquare, UserPlus, Check, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export default function NotificationsPage() {
  const { user, supabase, isInitialized, markNotificationsAsRead } = useUser()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/auth/login')
    }
  }, [isInitialized, user, router])

  const loadNotifications = useCallback(async () => {
    if (!user || !supabase) return

    try {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!notifs || notifs.length === 0) {
        if (mountedRef.current) {
          setNotifications([])
          setLoading(false)
        }
        return
      }

      // Get unique actor IDs
      const actorIds = [...new Set(notifs.map(n => n.actor_id).filter(Boolean))]
      
      // Fetch actor profiles
      let profilesMap = {}
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', actorIds)
        profiles?.forEach(p => { profilesMap[p.id] = p })
      }

      // Process notifications
      const processedNotifs = notifs.map(n => ({
        ...n,
        actor: profilesMap[n.actor_id] || null
      }))

      if (mountedRef.current) {
        setNotifications(processedNotifs)
        setLoading(false)
      }

      // Mark all as read
      const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds)
        
        // Update context
        markNotificationsAsRead?.()
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      if (mountedRef.current) setLoading(false)
    }
  }, [user, supabase, markNotificationsAsRead])

  useEffect(() => {
    if (isInitialized && user) {
      loadNotifications()
    }
  }, [isInitialized, user, loadNotifications])

  // Real-time subscription
  useEffect(() => {
    if (!supabase || !user) return

    const channel = supabase
      .channel('notifications-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user, loadNotifications])

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow': return <UserPlus className="h-4 w-4 text-blue-400" />
      case 'like': return <Heart className="h-4 w-4 text-red-400" />
      case 'comment': return <MessageSquare className="h-4 w-4 text-green-400" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationText = (notif) => {
    const actorName = notif.actor?.full_name || 'Someone'
    switch (notif.type) {
      case 'follow': return <><strong>{actorName}</strong> started following you</>
      case 'like': return <><strong>{actorName}</strong> liked your post</>
      case 'comment': return <><strong>{actorName}</strong> commented on your post</>
      default: return 'New notification'
    }
  }

  const getNotificationLink = (notif) => {
    switch (notif.type) {
      case 'follow':
        return notif.actor?.username ? `/u/${notif.actor.username}` : '#'
      case 'like':
      case 'comment':
        return '/feed' // Could link to specific post if we add post pages
      default:
        return '#'
    }
  }

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full skeleton" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 skeleton rounded" />
                      <div className="h-3 w-1/4 skeleton rounded" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">No notifications yet</p>
                  <p className="text-sm text-muted-foreground mt-1">When someone follows you or interacts with your posts, you'll see it here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      href={getNotificationLink(notif)}
                      className={`flex items-start gap-3 p-3 -mx-3 rounded-lg transition-colors hover:bg-white/5 ${
                        !notif.is_read ? 'bg-white/5' : ''
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notif.actor?.avatar_url} />
                        <AvatarFallback className="bg-white/10 text-sm">
                          {getInitials(notif.actor?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                          <p className="text-sm">{getNotificationText(notif)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.created_at ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }) : 'Just now'}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
