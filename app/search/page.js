'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import StartupCard from '@/components/StartupCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Building2, User, Filter } from 'lucide-react'
import Link from 'next/link'

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState('startups')
  const [startups, setStartups] = useState([])
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [followedIds, setFollowedIds] = useState([])
  const [loading, setLoading] = useState(false)
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

      // Get followed startup IDs
      const { data: follows } = await supabase
        .from('follows')
        .select('startup_id')
        .eq('user_id', user.id)
      setFollowedIds(follows?.map(f => f.startup_id) || [])

      // Initial search if query exists
      if (initialQuery) {
        performSearch(initialQuery)
      } else {
        // Load all approved startups
        loadAllStartups()
      }
    }
    init()
  }, [router, supabase, initialQuery])

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

    // Search startups
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

    // Search users
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

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Search Form */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search startups, people..."
                    className="pl-10"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button type="submit">Search</Button>
              </form>

              {/* Filters */}
              <div className="flex gap-4 mt-4">
                <Select value={domainFilter} onValueChange={(v) => { setDomainFilter(v); performSearch(query); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    <SelectItem value="fintech">FinTech</SelectItem>
                    <SelectItem value="healthtech">HealthTech</SelectItem>
                    <SelectItem value="edtech">EdTech</SelectItem>
                    <SelectItem value="ecommerce">E-Commerce</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="ai-ml">AI/ML</SelectItem>
                    <SelectItem value="deeptech">DeepTech</SelectItem>
                    <SelectItem value="consumer">Consumer</SelectItem>
                    <SelectItem value="b2b">B2B</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); performSearch(query); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="mvp">MVP</SelectItem>
                    <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series-a">Series A</SelectItem>
                    <SelectItem value="series-b">Series B+</SelectItem>
                    <SelectItem value="profitable">Profitable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="startups" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Startups ({startups.length})
              </TabsTrigger>
              <TabsTrigger value="people" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                People ({users.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="startups">
              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-lg p-4 h-32 skeleton-shimmer" />
                  ))}
                </div>
              ) : startups.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No startups found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {startups.map((startup) => (
                    <StartupCard
                      key={startup.id}
                      startup={startup}
                      currentUserId={currentUser?.id}
                      isFollowing={followedIds.includes(startup.id)}
                      onFollowChange={() => {
                        setFollowedIds(prev => 
                          prev.includes(startup.id)
                            ? prev.filter(id => id !== startup.id)
                            : [...prev, startup.id]
                        )
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="people">
              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-lg p-4 h-20 skeleton-shimmer" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No people found</h3>
                    <p className="text-muted-foreground">Try adjusting your search</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {users.map((user) => (
                    <Card key={user.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <Link href={`/profile/${user.id}`} className="flex items-center gap-4">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold hover:underline">{user.full_name}</h3>
                            {user.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{user.bio}</p>
                            )}
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
