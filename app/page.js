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
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-lg">in</span>
            </div>
            <span className="text-xl font-semibold text-primary">Startup Connect</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => router.push('/auth/login')}>
              Sign in
            </Button>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={() => router.push('/auth/register')}>
              Join now
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-light text-foreground/80 mb-6 leading-tight">
              Welcome to your <span className="text-foreground">startup community</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Connect with India's startup ecosystem. Discover startups, follow their journey, and engage with founders and professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8" onClick={() => router.push('/auth/register')}>
                Join now
              </Button>
              <Button size="lg" variant="outline" className="border-foreground/20" onClick={() => router.push('/auth/login')}>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center mb-3">Explore the platform</h2>
          <p className="text-muted-foreground text-center mb-10">Everything you need to connect with India's startup ecosystem</p>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <Card className="bg-white border hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Discover Startups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Explore verified startups across FinTech, HealthTech, EdTech and more. Follow their journey and stay updated.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Direct Messaging</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect directly with startups and founders. Build relationships and discuss opportunities.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-primary" />
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
      <section className="bg-white border-y py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-semibold text-primary">500+</div>
              <div className="text-sm text-muted-foreground mt-1">Startups</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground mt-1">Professionals</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-primary">50+</div>
              <div className="text-sm text-muted-foreground mt-1">Cities</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-primary">100+</div>
              <div className="text-sm text-muted-foreground mt-1">Events/Month</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-semibold mb-3">Join your startup community</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Whether you're a professional looking to connect or a startup wanting to grow, there's a place for you.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={() => router.push('/auth/register?type=user')}>
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
      <footer className="bg-foreground text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-primary font-bold">in</span>
            </div>
            <span className="font-semibold">Startup Connect India</span>
          </div>
          <p className="text-white/60 text-sm">© 2025 Startup Connect India. Built for the Indian startup ecosystem.</p>
        </div>
      </footer>
    </div>
  )
}
