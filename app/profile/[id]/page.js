'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Calendar, Edit, UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ProfilePage() {
  const { id } = useParams()
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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      setProfile(profileData)

      if (profileData?.role === 'user') {
        const { data: follows } = await supabase
          .from('follows')
          .select('startup_id, startups (id, name, logo_url, domain)')
          .eq('user_id', id)
        setFollowedStartups(follows?.map(f => f.startups).filter(Boolean) || [])
      }

      setLoading(false)
    }
    loadProfile()
  }, [id])

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  const isOwnProfile = currentUser?.id === id

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-lg border border-border p-6 h-64 skeleton" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-4xl mx-auto bg-card border-border">
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold">Profile not found</h2>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-white/10 to-white/5" />
            <CardContent className="relative pb-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar className="h-28 w-28 border-4 border-card -mt-14 shadow-lg">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-3xl bg-white/10">{getInitials(profile.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 sm:mt-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold">{profile.full_name}</h1>
                      <p className="text-muted-foreground capitalize">{profile.role}</p>
                    </div>
                    {isOwnProfile ? (
                      <Button variant="outline" size="sm" className="border-white/20" onClick={() => router.push('/settings')}>
                        <Edit className="h-4 w-4 mr-2" />Edit Profile
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-white text-background hover:bg-white/90">
                        <Mail className="h-4 w-4 mr-2" />Message
                      </Button>
                    )}
                  </div>
                  {profile.bio && <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>}
                </div>
              </div>

              {profile.skills?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/10">{skill}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{profile.email}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>

          {profile.role === 'user' && (
            <Card className="bg-card border-border">
              <Tabs defaultValue="following">
                <CardHeader className="pb-0">
                  <TabsList className="bg-secondary">
                    <TabsTrigger value="following" className="data-[state=active]:bg-white data-[state=active]:text-background">
                      Following ({followedStartups.length})
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:text-background">
                      Activity
                    </TabsTrigger>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {followedStartups.map((startup) => (
                          <div
                            key={startup.id}
                            className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-white/5 cursor-pointer"
                            onClick={() => router.push(`/startup/${startup.id}`)}
                          >
                            <Avatar>
                              <AvatarImage src={startup.logo_url} />
                              <AvatarFallback className="bg-white/10">{startup.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
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
                    <div className="text-center py-8 text-muted-foreground">No recent activity</div>
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
