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
import { Loader2, User, Building2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
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

      toast.success('Registration successful!')
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

      toast.success('Startup registration submitted! Awaiting admin approval.')
      router.push('/feed')
    } catch (error) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-lg">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to home
        </Link>
        
        <Card className="border shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-background font-bold">SC</span>
            </div>
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>Join the Indian startup ecosystem</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="user" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Professional
                </TabsTrigger>
                <TabsTrigger value="startup" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Startup
                </TabsTrigger>
              </TabsList>

              <TabsContent value="user">
                <form onSubmit={handleUserRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="userEmail">Email</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userPassword">Password</Label>
                      <div className="relative">
                        <Input
                          id="userPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 chars"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          required
                          minLength={6}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10 text-muted-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Your full name"
                      value={userForm.fullName}
                      onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself..."
                      value={userForm.bio}
                      onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      placeholder="React, Node.js, Product Management"
                      value={userForm.skills}
                      onChange={(e) => setUserForm({ ...userForm, skills: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Join as Professional'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="startup">
                <form onSubmit={handleStartupRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startupEmail">Email</Label>
                      <Input
                        id="startupEmail"
                        type="email"
                        placeholder="startup@example.com"
                        value={startupForm.email}
                        onChange={(e) => setStartupForm({ ...startupForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startupPassword">Password</Label>
                      <Input
                        id="startupPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 6 chars"
                        value={startupForm.password}
                        onChange={(e) => setStartupForm({ ...startupForm, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ownerName">Your Name</Label>
                      <Input
                        id="ownerName"
                        placeholder="Founder name"
                        value={startupForm.ownerName}
                        onChange={(e) => setStartupForm({ ...startupForm, ownerName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startupName">Startup Name</Label>
                      <Input
                        id="startupName"
                        placeholder="Your startup"
                        value={startupForm.startupName}
                        onChange={(e) => setStartupForm({ ...startupForm, startupName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain</Label>
                      <Select
                        value={startupForm.domain}
                        onValueChange={(value) => setStartupForm({ ...startupForm, domain: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
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
                    <div className="space-y-2">
                      <Label htmlFor="stage">Stage</Label>
                      <Select
                        value={startupForm.stage}
                        onValueChange={(value) => setStartupForm({ ...startupForm, stage: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="idea">Idea Stage</SelectItem>
                          <SelectItem value="mvp">MVP</SelectItem>
                          <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                          <SelectItem value="seed">Seed</SelectItem>
                          <SelectItem value="series-a">Series A</SelectItem>
                          <SelectItem value="series-b">Series B+</SelectItem>
                          <SelectItem value="profitable">Profitable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="What does your startup do?"
                      value={startupForm.description}
                      onChange={(e) => setStartupForm({ ...startupForm, description: e.target.value })}
                      rows={2}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamSize">Team Size</Label>
                      <Input
                        id="teamSize"
                        placeholder="e.g., 1-10"
                        value={startupForm.teamSize}
                        onChange={(e) => setStartupForm({ ...startupForm, teamSize: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Bangalore"
                        value={startupForm.location}
                        onChange={(e) => setStartupForm({ ...startupForm, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Register Startup'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="justify-center border-t pt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-foreground hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="w-10 h-10 skeleton rounded-lg" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
