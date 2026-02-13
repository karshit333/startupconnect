'use client'

import { useState, useRef, Suspense, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, User, Building2, Camera, X, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { validateUsername, generateUsername } from '@/lib/utils/username'

function RegisterForm() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'user')
  const [loading, setLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, error: null })
  const fileInputRef = useRef(null)
  const startupLogoRef = useRef(null)
  const router = useRouter()
  const supabase = createClient()

  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
    bio: '',
    skills: '',
    avatarUrl: '',
    avatarFile: null,
  })

  const [startupForm, setStartupForm] = useState({
    email: '',
    password: '',
    ownerName: '',
    ownerUsername: '',
    startupName: '',
    startupUsername: '',
    domain: '',
    description: '',
    stage: '',
    teamSize: '',
    location: '',
    logoUrl: '',
    logoFile: null,
    ownerAvatarUrl: '',
    ownerAvatarFile: null,
  })

  // Auto-generate username from name
  useEffect(() => {
    if (userForm.fullName && !userForm.username) {
      const suggested = generateUsername(userForm.fullName)
      setUserForm(prev => ({ ...prev, username: suggested }))
    }
  }, [userForm.fullName])

  useEffect(() => {
    if (startupForm.ownerName && !startupForm.ownerUsername) {
      const suggested = generateUsername(startupForm.ownerName)
      setStartupForm(prev => ({ ...prev, ownerUsername: suggested }))
    }
  }, [startupForm.ownerName])

  useEffect(() => {
    if (startupForm.startupName && !startupForm.startupUsername) {
      const suggested = generateUsername(startupForm.startupName)
      setStartupForm(prev => ({ ...prev, startupUsername: suggested }))
    }
  }, [startupForm.startupName])

  // Check username availability
  const checkUsernameAvailability = async (username, type = 'profiles') => {
    const validation = validateUsername(username)
    if (!validation.valid) {
      setUsernameStatus({ checking: false, available: false, error: validation.error })
      return false
    }

    setUsernameStatus({ checking: true, available: null, error: null })
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', validation.username)
      .maybeSingle()

    const { data: startupData } = await supabase
      .from('startups')
      .select('username')
      .eq('username', validation.username)
      .maybeSingle()

    const exists = profileData || startupData
    setUsernameStatus({ checking: false, available: !exists, error: exists ? 'Username already taken' : null })
    return !exists
  }

  const handleUserAvatarSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUserForm({ 
        ...userForm, 
        avatarFile: file, 
        avatarUrl: URL.createObjectURL(file) 
      })
    }
  }

  const handleStartupLogoSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setStartupForm({ 
        ...startupForm, 
        logoFile: file, 
        logoUrl: URL.createObjectURL(file) 
      })
    }
  }

  const handleOwnerAvatarSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setStartupForm({ 
        ...startupForm, 
        ownerAvatarFile: file, 
        ownerAvatarUrl: URL.createObjectURL(file) 
      })
    }
  }

  const uploadFile = async (file, bucket, fileName) => {
    const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
    return publicUrl
  }

  const handleUserRegister = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate username
      const validation = validateUsername(userForm.username)
      if (!validation.valid) {
        toast.error(validation.error)
        setLoading(false)
        return
      }

      // Check availability
      const available = await checkUsernameAvailability(userForm.username)
      if (!available) {
        toast.error('Username is already taken')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
      })

      if (authError) throw authError

      let avatarUrl = null
      if (userForm.avatarFile) {
        const ext = userForm.avatarFile.name.split('.').pop()
        avatarUrl = await uploadFile(userForm.avatarFile, 'avatars', `${authData.user.id}.${ext}`)
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: userForm.email,
        full_name: userForm.fullName,
        username: validation.username,
        bio: userForm.bio,
        skills: userForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        avatar_url: avatarUrl,
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
      // Validate usernames
      const ownerValidation = validateUsername(startupForm.ownerUsername)
      const startupValidation = validateUsername(startupForm.startupUsername)
      
      if (!ownerValidation.valid) {
        toast.error('Owner username: ' + ownerValidation.error)
        setLoading(false)
        return
      }
      if (!startupValidation.valid) {
        toast.error('Startup username: ' + startupValidation.error)
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: startupForm.email,
        password: startupForm.password,
      })

      if (authError) throw authError

      let ownerAvatarUrl = null
      if (startupForm.ownerAvatarFile) {
        const ext = startupForm.ownerAvatarFile.name.split('.').pop()
        ownerAvatarUrl = await uploadFile(startupForm.ownerAvatarFile, 'avatars', `${authData.user.id}.${ext}`)
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: startupForm.email,
        full_name: startupForm.ownerName,
        username: ownerValidation.username,
        avatar_url: ownerAvatarUrl,
        role: 'startup',
      })

      if (profileError) throw profileError

      let logoUrl = null
      if (startupForm.logoFile) {
        const ext = startupForm.logoFile.name.split('.').pop()
        logoUrl = await uploadFile(startupForm.logoFile, 'avatars', `startup_${authData.user.id}.${ext}`)
      }

      const { error: startupError } = await supabase.from('startups').insert({
        user_id: authData.user.id,
        name: startupForm.startupName,
        username: startupValidation.username,
        domain: startupForm.domain,
        description: startupForm.description,
        stage: startupForm.stage,
        team_size: startupForm.teamSize,
        location: startupForm.location,
        logo_url: logoUrl,
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

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  const UsernameInput = ({ value, onChange, onBlur }) => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
        onBlur={onBlur}
        className="h-10 bg-secondary border-0 pl-8 pr-8"
        placeholder="username"
      />
      {usernameStatus.checking && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {!usernameStatus.checking && usernameStatus.available === true && (
        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
      )}
      {!usernameStatus.checking && usernameStatus.available === false && (
        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <img src="/logo.png" alt="SUCI" className="h-16" />
        </Link>
      </header>

      <div className="flex justify-center px-4 py-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold">Join Startup Connect</h1>
            <p className="text-muted-foreground mt-1">Connect with India's startup ecosystem</p>
          </div>
          
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary">
                  <TabsTrigger value="user" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-background">
                    <User className="h-4 w-4" />Professional
                  </TabsTrigger>
                  <TabsTrigger value="startup" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-background">
                    <Building2 className="h-4 w-4" />Startup
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="user">
                  <form onSubmit={handleUserRegister} className="space-y-4">
                    {/* Profile Picture */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={userForm.avatarUrl} />
                          <AvatarFallback className="bg-white/10 text-2xl">{getInitials(userForm.fullName)}</AvatarFallback>
                        </Avatar>
                        <label className="absolute bottom-0 right-0 bg-white text-background rounded-full p-2 cursor-pointer hover:bg-white/90 shadow-lg">
                          <Camera className="h-4 w-4" />
                          <input type="file" accept="image/*" onChange={handleUserAvatarSelect} className="hidden" ref={fileInputRef} />
                        </label>
                        {userForm.avatarUrl && (
                          <button 
                            type="button"
                            onClick={() => setUserForm({ ...userForm, avatarUrl: '', avatarFile: null })}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Add profile picture (optional)</p>

                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Email</Label>
                      <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required className="h-11 bg-secondary border-0" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Password (6+ characters)</Label>
                      <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={6} className="h-11 bg-secondary border-0" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Full Name</Label>
                      <Input value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} required className="h-11 bg-secondary border-0" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Username</Label>
                      <UsernameInput
                        value={userForm.username}
                        onChange={(val) => setUserForm({ ...userForm, username: val })}
                        onBlur={() => userForm.username && checkUsernameAvailability(userForm.username)}
                      />
                      {usernameStatus.error && (
                        <p className="text-xs text-red-500">{usernameStatus.error}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Bio (optional)</Label>
                      <Textarea value={userForm.bio} onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })} rows={2} className="bg-secondary border-0 resize-none" />
                    </div>
                    <Button type="submit" className="w-full h-11 bg-white text-background hover:bg-white/90 font-semibold" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="startup">
                  <form onSubmit={handleStartupRegister} className="space-y-3">
                    {/* Startup Logo */}
                    <div className="flex justify-center gap-6">
                      <div className="text-center">
                        <div className="relative inline-block">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={startupForm.logoUrl} />
                            <AvatarFallback className="bg-white/10 text-xl">{startupForm.startupName?.slice(0, 2).toUpperCase() || 'ST'}</AvatarFallback>
                          </Avatar>
                          <label className="absolute bottom-0 right-0 bg-white text-background rounded-full p-1.5 cursor-pointer hover:bg-white/90 shadow-lg">
                            <Camera className="h-3 w-3" />
                            <input type="file" accept="image/*" onChange={handleStartupLogoSelect} className="hidden" ref={startupLogoRef} />
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Startup Logo</p>
                      </div>
                      <div className="text-center">
                        <div className="relative inline-block">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={startupForm.ownerAvatarUrl} />
                            <AvatarFallback className="bg-white/10 text-xl">{getInitials(startupForm.ownerName)}</AvatarFallback>
                          </Avatar>
                          <label className="absolute bottom-0 right-0 bg-white text-background rounded-full p-1.5 cursor-pointer hover:bg-white/90 shadow-lg">
                            <Camera className="h-3 w-3" />
                            <input type="file" accept="image/*" onChange={handleOwnerAvatarSelect} className="hidden" />
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Your Photo</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input type="email" value={startupForm.email} onChange={(e) => setStartupForm({ ...startupForm, email: e.target.value })} required className="h-10 bg-secondary border-0" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Password</Label>
                        <Input type="password" value={startupForm.password} onChange={(e) => setStartupForm({ ...startupForm, password: e.target.value })} required minLength={6} className="h-10 bg-secondary border-0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Your Name</Label>
                        <Input value={startupForm.ownerName} onChange={(e) => setStartupForm({ ...startupForm, ownerName: e.target.value })} required className="h-10 bg-secondary border-0" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Your @username</Label>
                        <div className="relative">
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</div>
                          <Input 
                            value={startupForm.ownerUsername} 
                            onChange={(e) => setStartupForm({ ...startupForm, ownerUsername: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })} 
                            className="h-10 bg-secondary border-0 pl-6" 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Startup Name</Label>
                        <Input value={startupForm.startupName} onChange={(e) => setStartupForm({ ...startupForm, startupName: e.target.value })} required className="h-10 bg-secondary border-0" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Startup @username</Label>
                        <div className="relative">
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</div>
                          <Input 
                            value={startupForm.startupUsername} 
                            onChange={(e) => setStartupForm({ ...startupForm, startupUsername: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })} 
                            className="h-10 bg-secondary border-0 pl-6" 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Domain</Label>
                        <Select value={startupForm.domain} onValueChange={(v) => setStartupForm({ ...startupForm, domain: v })}>
                          <SelectTrigger className="h-10 bg-secondary border-0"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="fintech">FinTech</SelectItem>
                            <SelectItem value="healthtech">HealthTech</SelectItem>
                            <SelectItem value="edtech">EdTech</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                            <SelectItem value="ai-ml">AI/ML</SelectItem>
                            <SelectItem value="ecommerce">E-Commerce</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Stage</Label>
                        <Select value={startupForm.stage} onValueChange={(v) => setStartupForm({ ...startupForm, stage: v })}>
                          <SelectTrigger className="h-10 bg-secondary border-0"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="idea">Idea</SelectItem>
                            <SelectItem value="mvp">MVP</SelectItem>
                            <SelectItem value="seed">Seed</SelectItem>
                            <SelectItem value="series-a">Series A+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Textarea value={startupForm.description} onChange={(e) => setStartupForm({ ...startupForm, description: e.target.value })} rows={2} required className="bg-secondary border-0 resize-none" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Location</Label>
                      <Input value={startupForm.location} onChange={(e) => setStartupForm({ ...startupForm, location: e.target.value })} placeholder="e.g., Bangalore" className="h-10 bg-secondary border-0" />
                    </div>
                    <Button type="submit" className="w-full h-11 bg-white text-background hover:bg-white/90 font-semibold" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Startup'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <p className="text-center mt-6 text-muted-foreground">
            Already on Startup Connect?{' '}
            <Link href="/auth/login" className="text-white hover:underline">Sign in</Link>
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
