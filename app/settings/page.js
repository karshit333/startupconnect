'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Settings, User, Lock, Loader2, Camera, AtSign, Check, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { validateUsername } from '@/lib/utils/username'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [startup, setStartup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({ full_name: '', bio: '', skills: '' })
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, error: null })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
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

      // Get startup if user is a startup owner
      if (profileData?.role === 'startup') {
        const { data: startupData } = await supabase.from('startups').select('*').eq('user_id', user.id).single()
        setStartup(startupData)
      }

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
      // Update profile username
      const { error } = await supabase.from('profiles').update({
        username: validation.username,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      if (error) throw error

      // Also update startup username if exists
      if (startup) {
        await supabase.from('startups').update({
          username: validation.username,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id)
        setStartup({ ...startup, username: validation.username })
      }

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm')
      return
    }

    setDeleting(true)
    try {
      // Delete user's data in order (respecting foreign keys)
      // 1. Delete notifications
      await supabase.from('notifications').delete().or(`user_id.eq.${user.id},actor_id.eq.${user.id}`)
      
      // 2. Delete messages
      await supabase.from('messages').delete().eq('sender_id', user.id)
      
      // 3. Delete conversations where user is participant
      await supabase.from('conversations').delete().or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      
      // 4. Delete comments
      await supabase.from('comments').delete().eq('user_id', user.id)
      
      // 5. Delete likes
      await supabase.from('likes').delete().eq('user_id', user.id)
      
      // 6. Delete saved posts
      await supabase.from('saved_posts').delete().eq('user_id', user.id)
      
      // 7. Delete follows
      await supabase.from('follows').delete().eq('user_id', user.id)
      
      // 8. If startup, delete startup-related data
      if (startup) {
        await supabase.from('follows').delete().eq('startup_id', startup.id)
        await supabase.from('posts').delete().eq('startup_id', startup.id)
        await supabase.from('startups').delete().eq('id', startup.id)
      }
      
      // 9. Delete profile
      await supabase.from('profiles').delete().eq('id', user.id)
      
      // 10. Sign out and delete auth user (this will be handled by Supabase)
      await supabase.auth.signOut()
      
      toast.success('Account deleted successfully')
      router.push('/')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete account. Please contact support.')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto bg-card rounded-lg border border-border p-6 h-96 skeleton" />
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
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
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
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

          {/* Danger Zone */}
          <Card className="bg-card border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500"><Trash2 className="h-5 w-5" />Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileNav />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data including:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Your profile and settings</li>
            <li>All your posts and comments</li>
            <li>Your messages and conversations</li>
            <li>Your startup (if any)</li>
            <li>All followers and following data</li>
          </ul>
          <div className="space-y-2">
            <Label>Type <span className="text-red-500 font-bold">DELETE</span> to confirm</Label>
            <Input 
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="bg-secondary border-0"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-white/20">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
