'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Settings, User, Lock, Loader2, Camera, AtSign, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { validateUsername } from '@/lib/utils/username'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({ full_name: '', bio: '', skills: '' })
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, error: null })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      setFormData({
        full_name: profileData?.full_name || '',
        bio: profileData?.bio || '',
        skills: profileData?.skills?.join(', ') || '',
      })
      setUsername(profileData?.username || '')
      setLoading(false)
    }
    init()
  }, [])

  const checkUsernameAvailability = async (usernameToCheck) => {
    if (usernameToCheck === profile?.username) {
      setUsernameStatus({ checking: false, available: true, error: null })
      return true
    }

    const validation = validateUsername(usernameToCheck)
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      toast.success('Avatar updated!')
    } catch (error) {
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveUsername = async () => {
    const validation = validateUsername(username)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    if (username === profile?.username) {
      toast.success('No changes to save')
      return
    }

    const available = await checkUsernameAvailability(username)
    if (!available) {
      toast.error('Username is not available')
      return
    }

    setSavingUsername(true)
    try {
      const { error } = await supabase.from('profiles').update({
        username: validation.username,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      if (error) throw error
      setProfile({ ...profile, username: validation.username })
      toast.success('Username updated!')
    } catch (error) {
      toast.error('Failed to update username')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: formData.full_name,
        bio: formData.bio,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      if (error) throw error
      toast.success('Profile updated!')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto bg-card rounded-lg border border-border p-6 h-96 skeleton" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><Settings className="h-6 w-6" />Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your account</p>
          </div>

          {/* Username Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AtSign className="h-5 w-5" />Username</CardTitle>
              <CardDescription>Your unique @username for your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</div>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      onBlur={() => username && checkUsernameAvailability(username)}
                      className="bg-secondary border-0 pl-8 pr-10"
                      placeholder="yourname"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus.checking && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {!usernameStatus.checking && usernameStatus.available === true && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {!usernameStatus.checking && usernameStatus.available === false && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleSaveUsername} 
                    disabled={savingUsername || usernameStatus.available === false}
                    className="bg-white text-background hover:bg-white/90"
                  >
                    {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
                {usernameStatus.error && (
                  <p className="text-xs text-red-500">{usernameStatus.error}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {profile?.username ? (
                    <>Your profile: <span className="text-white">/@{profile.username}</span></>
                  ) : (
                    'Set a username to get a custom profile URL'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Profile</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-xl bg-white/10">{getInitials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-white text-background rounded-full p-1.5 cursor-pointer hover:bg-white/90">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
                <div>
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">Role: {profile?.role}</p>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="bg-secondary border-0" />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={3} className="bg-secondary border-0 resize-none" />
                </div>
                <div className="space-y-2">
                  <Label>Skills (comma-separated)</Label>
                  <Input value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} className="bg-secondary border-0" />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="bg-white text-background hover:bg-white/90">
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Account</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Email</p><p className="text-sm text-muted-foreground">{user?.email}</p></div>
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Password</p><p className="text-sm text-muted-foreground">••••••••</p></div>
                <Button variant="outline" size="sm" disabled className="border-white/20">Change</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
