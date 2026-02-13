'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, MapPin, Clock, Users, ExternalLink, Filter } from 'lucide-react'
import { format } from 'date-fns'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      loadEvents()
    }
    init()
  }, [router, supabase])

  const loadEvents = async () => {
    setLoading(true)
    let query = supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })

    if (cityFilter !== 'all') {
      query = query.eq('city', cityFilter)
    }
    if (typeFilter !== 'all') {
      query = query.eq('event_type', typeFilter)
    }

    const { data } = await query
    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!loading) {
      loadEvents()
    }
  }, [cityFilter, typeFilter])

  const getEventTypeLabel = (type) => {
    const labels = {
      'hackathon': 'Hackathon',
      'pitch': 'Pitch Event',
      'workshop': 'Workshop',
      'meetup': 'Meetup',
      'conference': 'Conference',
      'networking': 'Networking',
    }
    return labels[type] || type
  }

  const getEventTypeColor = (type) => {
    const colors = {
      'hackathon': 'bg-purple-100 text-purple-800',
      'pitch': 'bg-blue-100 text-blue-800',
      'workshop': 'bg-green-100 text-green-800',
      'meetup': 'bg-yellow-100 text-yellow-800',
      'conference': 'bg-red-100 text-red-800',
      'networking': 'bg-pink-100 text-pink-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Events & Alerts</h1>
              <p className="text-muted-foreground">Discover startup events across India</p>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                    <SelectItem value="Chennai">Chennai</SelectItem>
                    <SelectItem value="Pune">Pune</SelectItem>
                    <SelectItem value="Kolkata">Kolkata</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="hackathon">Hackathon</SelectItem>
                    <SelectItem value="pitch">Pitch Event</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="meetup">Meetup</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 h-40 skeleton-shimmer" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">No upcoming events</h3>
                <p className="text-muted-foreground">Check back later for new events</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Date Badge */}
                      <div className="w-24 shrink-0 bg-primary/5 flex flex-col items-center justify-center p-4 border-r">
                        <span className="text-3xl font-bold text-primary">
                          {format(new Date(event.event_date), 'd')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(event.event_date), 'MMM')}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge className={getEventTypeColor(event.event_type)}>
                              {getEventTypeLabel(event.event_type)}
                            </Badge>
                            <h3 className="text-lg font-semibold mt-2">{event.title}</h3>
                          </div>
                        </div>

                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(event.event_date), 'h:mm a')}
                          </span>
                          {event.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.city}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              {event.location}
                            </span>
                          )}
                        </div>

                        {event.registration_url && (
                          <Button variant="outline" size="sm" className="mt-4" asChild>
                            <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Register
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
