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

export default function FollowingPage() {
  const { username } = useParams()
  const router = useRouter()
  const { user, supabase, isInitialized } = useUser()
  const [following, setFollowing] = useState([])
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)

  const cleanUsername = username?.toLowerCase()

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/auth/login')
    }
  }, [isInitialized, user, router])

  const loadData = useCallback(async () => {
    if (!user || !supabase) return

    try {
      // Find profile by username
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanUsername)
        .single()

      if (!profile) {
        setLoading(false)
        return
      }

      setProfileData(profile)

      // Get startups this user follows
      const { data: followsData } = await supabase
        .from('follows')
        .select('startup_id, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (!followsData || followsData.length === 0) {
        setFollowing([])
        setLoading(false)
        return
      }

      // Get startup details
      const startupIds = followsData.map(f => f.startup_id)
      const { data: startups } = await supabase
        .from('startups')
        .select('id, name, logo_url, username, domain')
        .in('id', startupIds)

      const startupsMap = {}
      startups?.forEach(s => { startupsMap[s.id] = s })

      const followingWithStartups = followsData.map(f => ({
        ...f,
        startup: startupsMap[f.startup_id] || null
      }))

      setFollowing(followingWithStartups)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase, cleanUsername])

  useEffect(() => {
    if (isInitialized && user) {
      loadData()
    }
  }, [isInitialized, user, loadData])

  const getInitials = (name) => name?.slice(0, 2).toUpperCase() || 'S'

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
                  <CardTitle className="text-lg">Following</CardTitle>
                  <p className="text-sm text-muted-foreground">@{cleanUsername}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {following.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Not following anyone yet</p>
                  <Button
                    onClick={() => router.push('/search')}
                    className="mt-4 bg-white text-background hover:bg-white/90"
                  >
                    Discover Startups
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {following.map((follow) => (
                    <Link
                      key={follow.startup_id}
                      href={follow.startup?.username ? `/u/${follow.startup.username}` : `/startup/${follow.startup_id}`}
                      className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={follow.startup?.logo_url} />
                        <AvatarFallback className="bg-white/10">
                          {getInitials(follow.startup?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{follow.startup?.name || 'Unknown Startup'}</p>
                        {follow.startup?.username && (
                          <p className="text-sm text-muted-foreground">@{follow.startup.username}</p>
                        )}
                        {follow.startup?.domain && (
                          <p className="text-xs text-muted-foreground capitalize">{follow.startup.domain}</p>
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
