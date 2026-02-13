'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, MapPin, Clock, ExternalLink } from 'lucide-react'
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
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    let query = supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })

    if (cityFilter !== 'all') query = query.eq('city', cityFilter)
    if (typeFilter !== 'all') query = query.eq('event_type', typeFilter)

    const { data } = await query
    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!loading) loadEvents()
  }, [cityFilter, typeFilter])

  const getEventTypeLabel = (type) => {
    const labels = { hackathon: 'Hackathon', pitch: 'Pitch Event', workshop: 'Workshop', meetup: 'Meetup', conference: 'Conference', networking: 'Networking' }
    return labels[type] || type
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Events & Alerts</h1>
              <p className="text-muted-foreground text-sm">Discover startup events across India</p>
            </div>
          </div>

          <Card className="bg-card border-border mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-muted-foreground">Filters:</span>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-36 bg-secondary border-0">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Cities</SelectItem>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-36 bg-secondary border-0">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="hackathon">Hackathon</SelectItem>
                    <SelectItem value="pitch">Pitch Event</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="meetup">Meetup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="bg-card rounded-lg border border-border p-4 h-32 skeleton" />)}
            </div>
          ) : events.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">No upcoming events</h3>
                <p className="text-muted-foreground text-sm">Check back later</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="bg-card border-border hover:border-white/20 transition-colors overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-24 shrink-0 bg-white/5 flex flex-col items-center justify-center p-4 border-r border-border">
                        <span className="text-3xl font-bold">{format(new Date(event.event_date), 'd')}</span>
                        <span className="text-sm text-muted-foreground">{format(new Date(event.event_date), 'MMM')}</span>
                      </div>
                      <div className="flex-1 p-4">
                        <Badge variant="secondary" className="bg-white/10 capitalize mb-2">{getEventTypeLabel(event.event_type)}</Badge>
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        {event.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>}
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{format(new Date(event.event_date), 'h:mm a')}</span>
                          {event.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{event.city}</span>}
                        </div>
                        {event.registration_url && (
                          <Button variant="outline" size="sm" className="mt-4 border-white/20" asChild>
                            <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />Register
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
