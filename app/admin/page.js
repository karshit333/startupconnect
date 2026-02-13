'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { TableSkeleton } from '@/components/FeedSkeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Shield, Building2, Calendar, Users, CheckCircle, XCircle, Plus, Trash2, Eye, AlertCircle, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [pendingStartups, setPendingStartups] = useState([])
  const [allStartups, setAllStartups] = useState([])
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState({ users: 0, startups: 0, posts: 0, events: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'meetup',
    event_date: '',
    city: '',
    location: '',
    registration_url: '',
  })
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

      // Check if admin
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      if (profileData?.role !== 'admin') {
        toast.error('Access denied. Admin only.')
        router.push('/feed')
        return
      }

      await loadData()
      setLoading(false)
    }
    init()
  }, [router, supabase])

  const loadData = async () => {
    // Load pending startups (is_approved = false)
    const { data: pending, error: pendingError } = await supabase
      .from('startups')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
    
    console.log('Pending startups:', pending, 'Error:', pendingError)
    
    // Fetch profile info separately for each pending startup
    const pendingWithProfiles = await Promise.all(
      (pending || []).map(async (startup) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', startup.user_id)
          .single()
        return { ...startup, profiles: profile }
      })
    )
    
    setPendingStartups(pendingWithProfiles)

    // Load all startups
    const { data: all } = await supabase
      .from('startups')
      .select('*')
      .order('created_at', { ascending: false })
    setAllStartups(all || [])

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
    setEvents(eventsData || [])

    // Load stats
    const { count: usersCount } = await supabase.from('profiles').select('id', { count: 'exact' })
    const { count: startupsCount } = await supabase.from('startups').select('id', { count: 'exact' }).eq('is_approved', true)
    const { count: postsCount } = await supabase.from('posts').select('id', { count: 'exact' })
    const { count: eventsCount } = await supabase.from('events').select('id', { count: 'exact' })

    setStats({
      users: usersCount || 0,
      startups: startupsCount || 0,
      posts: postsCount || 0,
      events: eventsCount || 0,
    })
  }

  const approveStartup = async (startupId) => {
    setActionLoading(startupId)
    try {
      const { error } = await supabase
        .from('startups')
        .update({ is_approved: true })
        .eq('id', startupId)

      if (error) throw error

      toast.success('Startup approved!')
      await loadData()
    } catch (error) {
      toast.error('Failed to approve startup')
    } finally {
      setActionLoading(null)
    }
  }

  const rejectStartup = async (startupId) => {
    setActionLoading(startupId)
    try {
      const { error } = await supabase
        .from('startups')
        .delete()
        .eq('id', startupId)

      if (error) throw error

      toast.success('Startup rejected and removed')
      await loadData()
    } catch (error) {
      toast.error('Failed to reject startup')
    } finally {
      setActionLoading(null)
    }
  }

  const createEvent = async () => {
    if (!newEvent.title || !newEvent.event_date) {
      toast.error('Please fill in required fields')
      return
    }

    setActionLoading('event')
    try {
      const { error } = await supabase.from('events').insert({
        ...newEvent,
        created_by: currentUser.id,
      })

      if (error) throw error

      toast.success('Event created!')
      setEventDialogOpen(false)
      setNewEvent({
        title: '',
        description: '',
        event_type: 'meetup',
        event_date: '',
        city: '',
        location: '',
        registration_url: '',
      })
      await loadData()
    } catch (error) {
      toast.error('Failed to create event')
    } finally {
      setActionLoading(null)
    }
  }

  const deleteEvent = async (eventId) => {
    setActionLoading(eventId)
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      toast.success('Event deleted!')
      await loadData()
    } catch (error) {
      toast.error('Failed to delete event')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <div className="h-8 w-48 skeleton rounded mb-2" />
            <div className="h-4 w-64 skeleton rounded" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 skeleton rounded-lg" />
                  <div>
                    <div className="h-6 w-12 skeleton rounded mb-1" />
                    <div className="h-4 w-16 skeleton rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <TableSkeleton rows={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Shield className="h-4 w-4 text-background" />
            </div>
            <h1 className="text-xl font-semibold">Admin Panel</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage startups, events, and platform settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.users}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.startups}</p>
                  <p className="text-xs text-muted-foreground">Startups</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{pendingStartups.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.events}</p>
                  <p className="text-xs text-muted-foreground">Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending Approvals ({pendingStartups.length})
            </TabsTrigger>
            <TabsTrigger value="startups">
              All Startups ({allStartups.length})
            </TabsTrigger>
            <TabsTrigger value="events">
              Events ({events.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Startups */}
          <TabsContent value="pending">
            {pendingStartups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="font-semibold">All caught up!</h3>
                  <p className="text-muted-foreground">No pending startup approvals</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingStartups.map((startup) => (
                  <Card key={startup.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={startup.logo_url} />
                            <AvatarFallback>{startup.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg">{startup.name}</h3>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary">{startup.domain}</Badge>
                              {startup.stage && <Badge variant="outline">{startup.stage}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{startup.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Submitted by: {startup.profiles?.full_name} ({startup.profiles?.email})
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveStartup(startup.id)}
                            disabled={actionLoading === startup.id}
                          >
                            {actionLoading === startup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectStartup(startup.id)}
                            disabled={actionLoading === startup.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Startups */}
          <TabsContent value="startups">
            <div className="space-y-4">
              {allStartups.map((startup) => (
                <Card key={startup.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={startup.logo_url} />
                          <AvatarFallback>{startup.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{startup.name}</h3>
                            {startup.is_approved ? (
                              <Badge className="bg-green-100 text-green-800">Approved</Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600">Pending</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{startup.domain} • {startup.location}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/startup/${startup.id}`)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Events */}
          <TabsContent value="events">
            <div className="mb-4">
              <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                    <DialogDescription>
                      Add a new event for the startup community
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        placeholder="Event title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Event description"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Event Type</Label>
                        <Select
                          value={newEvent.event_type}
                          onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hackathon">Hackathon</SelectItem>
                            <SelectItem value="pitch">Pitch Event</SelectItem>
                            <SelectItem value="workshop">Workshop</SelectItem>
                            <SelectItem value="meetup">Meetup</SelectItem>
                            <SelectItem value="conference">Conference</SelectItem>
                            <SelectItem value="networking">Networking</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date & Time *</Label>
                        <Input
                          type="datetime-local"
                          value={newEvent.event_date}
                          onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={newEvent.city}
                          onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                          placeholder="e.g., Bangalore"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Venue</Label>
                        <Input
                          value={newEvent.location}
                          onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                          placeholder="Venue name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Registration URL</Label>
                      <Input
                        value={newEvent.registration_url}
                        onChange={(e) => setNewEvent({ ...newEvent, registration_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createEvent} disabled={actionLoading === 'event'}>
                      {actionLoading === 'event' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Create Event
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold">No events created</h3>
                  <p className="text-muted-foreground">Create your first event above</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{event.title}</h3>
                            <Badge variant="secondary">{event.event_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(event.event_date), 'PPp')} • {event.city || 'Online'}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                          disabled={actionLoading === event.id}
                        >
                          {actionLoading === event.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
