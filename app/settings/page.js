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
import { Settings, User, Lock, Loader2, Camera } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({ full_name: '', bio: '', skills: '' })
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
      setLoading(false)
    }
    init()
  }, [])

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
