'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Rocket, Users, Calendar, MessageSquare, TrendingUp, Building2 } from 'lucide-react'

export default function LandingPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/feed')
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-primary">Startup Connect India</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.push('/auth/login')}>
              Sign In
            </Button>
            <Button onClick={() => router.push('/auth/register')}>
              Join Now
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Connect with India's
            <span className="text-primary block mt-2">Startup Ecosystem</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The professional networking platform purpose-built for Indian startups, founders, and professionals. Discover, follow, and engage with the startup community.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => router.push('/auth/register')} className="px-8">
              Get Started - It's Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/auth/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Startup Connect India?</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Building2 className="h-12 w-12 text-primary mb-2" />
              <CardTitle>Discover Startups</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Explore verified startups across domains. Follow their journey, job openings, and announcements.
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mb-2" />
              <CardTitle>Direct Messaging</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Connect directly with startups. Send messages, discuss opportunities, and build relationships.
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Calendar className="h-12 w-12 text-primary mb-2" />
              <CardTitle>Events & Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Stay updated with hackathons, pitch events, workshops, and startup meetups across India.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold">500+</div>
              <div className="text-blue-100">Startups</div>
            </div>
            <div>
              <div className="text-4xl font-bold">10K+</div>
              <div className="text-blue-100">Professionals</div>
            </div>
            <div>
              <div className="text-4xl font-bold">50+</div>
              <div className="text-blue-100">Cities</div>
            </div>
            <div>
              <div className="text-4xl font-bold">100+</div>
              <div className="text-blue-100">Events/Month</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Join the Ecosystem?</h2>
        <p className="text-muted-foreground mb-8">Whether you're a professional or a startup, there's a place for you.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" onClick={() => router.push('/auth/register?type=user')}>
            <Users className="mr-2 h-5 w-5" />
            Join as Professional
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push('/auth/register?type=startup')}>
            <Building2 className="mr-2 h-5 w-5" />
            Register Startup
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="font-semibold text-primary">Startup Connect India</span>
          </div>
          <p>© 2025 Startup Connect India. Built for the Indian startup ecosystem.</p>
        </div>
      </footer>
    </div>
  )
}
