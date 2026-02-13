'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, Building2, User, MapPin, Users, UserPlus, UserMinus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState('startups')
  const [startups, setStartups] = useState([])
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [followedIds, setFollowedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [domainFilter, setDomainFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUser(user)

      const { data: follows } = await supabase
        .from('follows')
        .select('startup_id')
        .eq('user_id', user.id)
      setFollowedIds(follows?.map(f => f.startup_id) || [])

      if (initialQuery) {
        performSearch(initialQuery)
      } else {
        loadAllStartups()
      }
    }
    init()
  }, [])

  const loadAllStartups = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('startups')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
    setStartups(data || [])
    setLoading(false)
  }

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      loadAllStartups()
      return
    }

    setLoading(true)

    let startupQuery = supabase
      .from('startups')
      .select('*')
      .eq('is_approved', true)
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,domain.ilike.%${searchQuery}%`)

    if (domainFilter !== 'all') {
      startupQuery = startupQuery.eq('domain', domainFilter)
    }
    if (stageFilter !== 'all') {
      startupQuery = startupQuery.eq('stage', stageFilter)
    }

    const { data: startupsData } = await startupQuery
    setStartups(startupsData || [])

    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'user')
      .or(`full_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
    setUsers(usersData || [])

    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    performSearch(query)
  }

  const handleFollow = async (startupId) => {
    if (!currentUser) return

    try {
      if (followedIds.includes(startupId)) {
        await supabase.from('follows').delete().eq('startup_id', startupId).eq('user_id', currentUser.id)
        setFollowedIds(prev => prev.filter(id => id !== startupId))
        toast.success('Unfollowed')
      } else {
        await supabase.from('follows').insert({ startup_id: startupId, user_id: currentUser.id })
        setFollowedIds(prev => [...prev, startupId])
        toast.success('Following')
      }
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Search */}
          <Card className="bg-card border-border mb-6">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search startups, people..."
                    className="pl-10 bg-secondary border-0"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" className="bg-white text-background hover:bg-white/90">Search</Button>
              </form>

              <div className="flex gap-3 mt-4">
                <Select value={domainFilter} onValueChange={(v) => { setDomainFilter(v); performSearch(query); }}>
                  <SelectTrigger className="w-36 bg-secondary border-0">
                    <SelectValue placeholder="Domain" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Domains</SelectItem>
                    <SelectItem value="fintech">FinTech</SelectItem>
                    <SelectItem value="healthtech">HealthTech</SelectItem>
                    <SelectItem value="edtech">EdTech</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="ai-ml">AI/ML</SelectItem>
                    <SelectItem value="ecommerce">E-Commerce</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); performSearch(query); }}>
                  <SelectTrigger className="w-36 bg-secondary border-0">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="mvp">MVP</SelectItem>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series-a">Series A+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-secondary">
              <TabsTrigger value="startups" className="data-[state=active]:bg-white data-[state=active]:text-background">
                <Building2 className="h-4 w-4 mr-2" />
                Startups ({startups.length})
              </TabsTrigger>
              <TabsTrigger value="people" className="data-[state=active]:bg-white data-[state=active]:text-background">
                <User className="h-4 w-4 mr-2" />
                People ({users.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="startups">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card rounded-lg border border-border p-4 h-32 skeleton" />
                  ))}
                </div>
              ) : startups.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No startups found</h3>
                    <p className="text-muted-foreground text-sm">Try adjusting your search</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {startups.map((startup) => (
                    <Card key={startup.id} className="bg-card border-border hover:border-white/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <Link href={`/startup/${startup.id}`} className="flex items-start gap-3 group flex-1">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={startup.logo_url} />
                              <AvatarFallback className="bg-white/10">{startup.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold group-hover:underline">{startup.name}</h3>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="bg-white/10 text-white capitalize">{startup.domain}</Badge>
                                {startup.stage && <Badge variant="outline" className="border-white/20 capitalize">{startup.stage}</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{startup.description}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {startup.location && (
                                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{startup.location}</span>
                                )}
                                {startup.team_size && (
                                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{startup.team_size}</span>
                                )}
                              </div>
                            </div>
                          </Link>
                          <Button
                            variant={followedIds.includes(startup.id) ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleFollow(startup.id)}
                            className={followedIds.includes(startup.id) ? 'border-white/20' : 'bg-white text-background hover:bg-white/90'}
                          >
                            {followedIds.includes(startup.id) ? (
                              <><UserMinus className="h-4 w-4 mr-1" />Following</>
                            ) : (
                              <><UserPlus className="h-4 w-4 mr-1" />Follow</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="people">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card rounded-lg border border-border p-4 h-20 skeleton" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="py-12 text-center">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No people found</h3>
                    <p className="text-muted-foreground text-sm">Try adjusting your search</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <Card key={user.id} className="bg-card border-border hover:border-white/20 transition-colors">
                      <CardContent className="p-4">
                        <Link href={`/profile/${user.id}`} className="flex items-center gap-4">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-white/10">{getInitials(user.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold hover:underline">{user.full_name}</h3>
                            {user.bio && <p className="text-sm text-muted-foreground line-clamp-1">{user.bio}</p>}
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 skeleton rounded" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
