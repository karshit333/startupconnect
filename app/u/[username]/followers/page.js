'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/lib/context/UserContext'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function FollowersPage() {
  const { username } = useParams()
  const router = useRouter()
  const { user, supabase, isInitialized } = useUser()
  const [followers, setFollowers] = useState([])
  const [profileData, setProfileData] = useState(null)
  const [startupData, setStartupData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [followingStatus, setFollowingStatus] = useState({}) // Track who current user follows

  const cleanUsername = username?.toLowerCase()

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/auth/login')
    }
  }, [isInitialized, user, router])

  const loadData = useCallback(async () => {
    if (!user || !supabase) return

    try {
      // First find the startup by username
      const { data: startup } = await supabase
        .from('startups')
        .select('*')
        .eq('username', cleanUsername)
        .single()

      if (!startup) {
        // Try profile username
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', cleanUsername)
          .single()

        if (profile?.role === 'startup') {
          const { data: userStartup } = await supabase
            .from('startups')
            .select('*')
            .eq('user_id', profile.id)
            .single()
          
          if (userStartup) {
            setStartupData(userStartup)
            setProfileData(profile)
            await loadFollowers(userStartup.id)
          }
        } else {
          setProfileData(profile)
        }
        setLoading(false)
        return
      }

      setStartupData(startup)
      
      // Get owner profile
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', startup.user_id)
        .single()
      setProfileData(ownerProfile)

      await loadFollowers(startup.id)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase, cleanUsername])

  const loadFollowers = async (startupId) => {
    // Get followers
    const { data: followsData } = await supabase
      .from('follows')
      .select('user_id, created_at')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false })

    if (!followsData || followsData.length === 0) {
      setFollowers([])
      return
    }

    // Get follower profiles
    const followerIds = followsData.map(f => f.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, role')
      .in('id', followerIds)

    const profilesMap = {}
    profiles?.forEach(p => { profilesMap[p.id] = p })

    const followersWithProfiles = followsData.map(f => ({
      ...f,
      profile: profilesMap[f.user_id] || null
    }))

    setFollowers(followersWithProfiles)

    // Check which ones current user follows (if they have startups)
    // This is for the "Follow back" functionality
  }

  useEffect(() => {
    if (isInitialized && user) {
      loadData()
    }
  }, [isInitialized, user, loadData])

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="h-64 skeleton rounded-lg" />
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
            <CardHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-lg">Followers</CardTitle>
                  <p className="text-sm text-muted-foreground">@{cleanUsername}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {followers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">No followers yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followers.map((follower) => (
                    <Link
                      key={follower.user_id}
                      href={follower.profile?.username ? `/u/${follower.profile.username}` : '#'}
                      className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={follower.profile?.avatar_url} />
                        <AvatarFallback className="bg-white/10">
                          {getInitials(follower.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{follower.profile?.full_name || 'Unknown'}</p>
                        {follower.profile?.username && (
                          <p className="text-sm text-muted-foreground">@{follower.profile.username}</p>
                        )}
                      </div>
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
