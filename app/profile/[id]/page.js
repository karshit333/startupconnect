'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapPin, Briefcase, GraduationCap, Mail, Calendar, Edit, UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ProfilePage({ params }) {
  const { id } = use(params)
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [followedStartups, setFollowedStartups] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      setProfile(profileData)

      // Load followed startups if it's a user profile
      if (profileData?.role === 'user') {
        const { data: follows } = await supabase
          .from('follows')
          .select(`
            startup_id,
            startups (id, name, logo_url, domain)
          `)
          .eq('user_id', id)
        setFollowedStartups(follows?.map(f => f.startups).filter(Boolean) || [])
      }

      setLoading(false)
    }
    loadProfile()
  }, [id, router, supabase])

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  const isOwnProfile = currentUser?.id === id

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6 skeleton-shimmer h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold">Profile not found</h2>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Profile Header */}
          <Card>
            <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 rounded-t-lg" />
            <CardContent className="relative pb-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar className="h-28 w-28 border-4 border-white -mt-14 shadow-lg">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-3xl">{getInitials(profile.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 sm:mt-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                      <p className="text-muted-foreground capitalize">{profile.role}</p>
                    </div>
                    {isOwnProfile ? (
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    ) : (
                      <Button size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    )}
                  </div>
                  {profile.bio && (
                    <p className="mt-2 text-sm">{profile.bio}</p>
                  )}
                </div>
              </div>

              {/* Skills */}
              {profile.skills?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          {profile.role === 'user' && (
            <Card>
              <Tabs defaultValue="following">
                <CardHeader className="pb-0">
                  <TabsList>
                    <TabsTrigger value="following">Following ({followedStartups.length})</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  <TabsContent value="following" className="mt-0">
                    {followedStartups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Not following any startups yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {followedStartups.map((startup) => (
                          <div
                            key={startup.id}
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => router.push(`/startup/${startup.id}`)}
                          >
                            <Avatar>
                              <AvatarImage src={startup.logo_url} />
                              <AvatarFallback>{startup.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{startup.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{startup.domain}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="activity" className="mt-0">
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No recent activity</p>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
