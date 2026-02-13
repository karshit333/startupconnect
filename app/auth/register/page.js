'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, User, Building2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

function RegisterForm() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'user')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    bio: '',
    skills: '',
  })

  const [startupForm, setStartupForm] = useState({
    email: '',
    password: '',
    ownerName: '',
    startupName: '',
    domain: '',
    description: '',
    stage: '',
    teamSize: '',
    location: '',
    website: '',
  })

  const handleUserRegister = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
      })

      if (authError) throw authError

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: userForm.email,
        full_name: userForm.fullName,
        bio: userForm.bio,
        skills: userForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        role: 'user',
      })

      if (profileError) throw profileError

      toast.success('Welcome to Startup Connect!')
      router.push('/feed')
    } catch (error) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleStartupRegister = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: startupForm.email,
        password: startupForm.password,
      })

      if (authError) throw authError

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: startupForm.email,
        full_name: startupForm.ownerName,
        role: 'startup',
      })

      if (profileError) throw profileError

      const { error: startupError } = await supabase.from('startups').insert({
        user_id: authData.user.id,
        name: startupForm.startupName,
        domain: startupForm.domain,
        description: startupForm.description,
        stage: startupForm.stage,
        team_size: startupForm.teamSize,
        location: startupForm.location,
        website: startupForm.website,
        is_approved: false,
      })

      if (startupError) throw startupError

      toast.success('Startup registration submitted!')
      router.push('/feed')
    } catch (error) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-9 h-9 bg-primary rounded flex items-center justify-center">
            <span className="text-white font-bold text-lg">in</span>
          </div>
          <span className="text-2xl font-semibold text-primary">Startup Connect</span>
        </Link>
      </header>

      <div className="flex justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-normal text-foreground">Join Startup Connect</h1>
            <p className="text-muted-foreground mt-2">Make the most of your professional life</p>
          </div>
          
          <Card className="border shadow-lg">
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
                  <TabsTrigger value="user" className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Professional
                  </TabsTrigger>
                  <TabsTrigger value="startup" className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" />
                    Startup
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="user">
                  <form onSubmit={handleUserRegister} className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Password (6+ characters)</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          required
                          minLength={6}
                          className="h-11 pr-16"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-primary font-semibold"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Full Name</Label>
                      <Input
                        value={userForm.fullName}
                        onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Bio (optional)</Label>
                      <Textarea
                        value={userForm.bio}
                        onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                        rows={2}
                        placeholder="Tell us about yourself"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Skills (comma-separated)</Label>
                      <Input
                        value={userForm.skills}
                        onChange={(e) => setUserForm({ ...userForm, skills: e.target.value })}
                        placeholder="React, Node.js, Product"
                        className="h-11"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-semibold" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agree & Join'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="startup">
                  <form onSubmit={handleStartupRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input
                          type="email"
                          value={startupForm.email}
                          onChange={(e) => setStartupForm({ ...startupForm, email: e.target.value })}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Password</Label>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={startupForm.password}
                          onChange={(e) => setStartupForm({ ...startupForm, password: e.target.value })}
                          required
                          minLength={6}
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Your Name</Label>
                        <Input
                          value={startupForm.ownerName}
                          onChange={(e) => setStartupForm({ ...startupForm, ownerName: e.target.value })}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Startup Name</Label>
                        <Input
                          value={startupForm.startupName}
                          onChange={(e) => setStartupForm({ ...startupForm, startupName: e.target.value })}
                          required
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Domain</Label>
                        <Select value={startupForm.domain} onValueChange={(v) => setStartupForm({ ...startupForm, domain: v })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fintech">FinTech</SelectItem>
                            <SelectItem value="healthtech">HealthTech</SelectItem>
                            <SelectItem value="edtech">EdTech</SelectItem>
                            <SelectItem value="ecommerce">E-Commerce</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                            <SelectItem value="ai-ml">AI/ML</SelectItem>
                            <SelectItem value="deeptech">DeepTech</SelectItem>
                            <SelectItem value="consumer">Consumer</SelectItem>
                            <SelectItem value="b2b">B2B</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Stage</Label>
                        <Select value={startupForm.stage} onValueChange={(v) => setStartupForm({ ...startupForm, stage: v })}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="idea">Idea</SelectItem>
                            <SelectItem value="mvp">MVP</SelectItem>
                            <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                            <SelectItem value="seed">Seed</SelectItem>
                            <SelectItem value="series-a">Series A</SelectItem>
                            <SelectItem value="series-b">Series B+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Textarea
                        value={startupForm.description}
                        onChange={(e) => setStartupForm({ ...startupForm, description: e.target.value })}
                        rows={2}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Location</Label>
                        <Input
                          value={startupForm.location}
                          onChange={(e) => setStartupForm({ ...startupForm, location: e.target.value })}
                          placeholder="Bangalore"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Team Size</Label>
                        <Input
                          value={startupForm.teamSize}
                          onChange={(e) => setStartupForm({ ...startupForm, teamSize: e.target.value })}
                          placeholder="1-10"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 font-semibold" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Startup'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <p className="text-center mt-6">
            Already on Startup Connect?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 skeleton rounded" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
