'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Building2, MessageSquare, Calendar, Users, Zap, Shield, Globe } from 'lucide-react'

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 skeleton rounded-full" />
          <div className="h-4 w-32 skeleton rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">SC</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Startup Connect</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push('/auth/login')}>
              Sign In
            </Button>
            <Button onClick={() => router.push('/auth/register')}>
              Join Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm mb-6">
            <span className="w-2 h-2 bg-foreground rounded-full animate-pulse" />
            India's Startup Network
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">
            Connect with India's
            <span className="block">Startup Ecosystem</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            The professional networking platform purpose-built for Indian startups, founders, and professionals. Discover, follow, and engage.
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" onClick={() => router.push('/auth/register')}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/auth/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-3">Why Startup Connect?</h2>
            <p className="text-muted-foreground">Everything you need to connect with the startup ecosystem</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border bg-card card-hover">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center mb-3">
                  <Building2 className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Discover Startups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Explore verified startups across domains. Follow their journey, job openings, and announcements in real-time.
                </p>
              </CardContent>
            </Card>
            <Card className="border bg-card card-hover">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Direct Messaging</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Connect directly with startups and founders. Send messages, discuss opportunities, and build relationships.
                </p>
              </CardContent>
            </Card>
            <Card className="border bg-card card-hover">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center mb-3">
                  <Calendar className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Events & Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Stay updated with hackathons, pitch events, workshops, and startup meetups happening across India.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-semibold">500+</div>
              <div className="text-sm text-muted-foreground mt-1">Startups</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-semibold">10K+</div>
              <div className="text-sm text-muted-foreground mt-1">Professionals</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-semibold">50+</div>
              <div className="text-sm text-muted-foreground mt-1">Cities</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-semibold">100+</div>
              <div className="text-sm text-muted-foreground mt-1">Events/Month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                  Built for the Indian Startup Ecosystem
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Verified Startups</h4>
                      <p className="text-sm text-muted-foreground">All startups are verified by our team before approval</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Real-time Updates</h4>
                      <p className="text-sm text-muted-foreground">Get instant notifications for posts, messages, and events</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Pan-India Network</h4>
                      <p className="text-sm text-muted-foreground">Connect with startups from Bangalore to Delhi and beyond</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-card border rounded-xl p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-foreground/10" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-foreground/10 rounded" />
                      <div className="h-3 w-16 bg-foreground/5 rounded mt-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-foreground/10" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-foreground/10 rounded" />
                      <div className="h-3 w-20 bg-foreground/5 rounded mt-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-foreground/10" />
                    <div className="flex-1">
                      <div className="h-4 w-28 bg-foreground/10 rounded" />
                      <div className="h-3 w-14 bg-foreground/5 rounded mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">Ready to Join?</h2>
          <p className="text-muted-foreground mb-8">Whether you're a professional or a startup, there's a place for you.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button size="lg" onClick={() => router.push('/auth/register?type=user')}>
              <Users className="mr-2 h-4 w-4" />
              Join as Professional
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/auth/register?type=startup')}>
              <Building2 className="mr-2 h-4 w-4" />
              Register Startup
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
              <span className="text-background font-bold text-xs">SC</span>
            </div>
            <span className="font-medium">Startup Connect India</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 Startup Connect India. Built for the Indian startup ecosystem.</p>
        </div>
      </footer>
    </div>
  )
}
