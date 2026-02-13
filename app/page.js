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
      <div className="min-h-screen flex items-center justify-center bg-background">
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
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SUCI" className="h-16" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => router.push('/auth/login')}>
              Sign in
            </Button>
            <Button className="bg-white text-background hover:bg-white/90" onClick={() => router.push('/auth/register')}>
              Join now
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-6">
              Connect with India's
              <span className="block text-muted-foreground">Startup Ecosystem</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              The professional networking platform for Indian startups. Discover startups, follow their journey, and engage with founders.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-white text-background hover:bg-white/90 px-8" onClick={() => router.push('/auth/register')}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-border hover:bg-white/5" onClick={() => router.push('/auth/login')}>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center mb-3">Explore the platform</h2>
          <p className="text-muted-foreground text-center mb-12">Everything you need to connect with the startup ecosystem</p>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <Card className="bg-card border-border hover:border-white/20 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">Discover Startups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Explore verified startups across FinTech, HealthTech, EdTech and more. Follow their journey and stay updated.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border hover:border-white/20 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">Direct Messaging</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect directly with startups and founders. Build relationships and discuss opportunities.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border hover:border-white/20 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">Events & Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Stay updated with hackathons, pitch events, workshops, and startup meetups across India.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-semibold">500+</div>
              <div className="text-sm text-muted-foreground mt-1">Startups</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">10K+</div>
              <div className="text-sm text-muted-foreground mt-1">Professionals</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">50+</div>
              <div className="text-sm text-muted-foreground mt-1">Cities</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">100+</div>
              <div className="text-sm text-muted-foreground mt-1">Events/Month</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold mb-3">Join the community</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Whether you're a professional or a startup, there's a place for you.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button size="lg" className="bg-white text-background hover:bg-white/90" onClick={() => router.push('/auth/register?type=user')}>
              <Users className="mr-2 h-4 w-4" />
              Join as Professional
            </Button>
            <Button size="lg" variant="outline" className="border-border hover:bg-white/5" onClick={() => router.push('/auth/register?type=startup')}>
              <Building2 className="mr-2 h-4 w-4" />
              Register Startup
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="SUCI" className="h-14" />
          </div>
          <p className="text-sm text-muted-foreground">© 2025 Startup Connect India. Built for the Indian startup ecosystem.</p>
        </div>
      </footer>
    </div>
  )
}
