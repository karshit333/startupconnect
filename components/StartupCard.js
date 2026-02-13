'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Users, ExternalLink, UserPlus, UserMinus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function StartupCard({ startup, currentUserId, isFollowing: initialFollowing, onFollowChange }) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleFollow = async () => {
    if (!currentUserId) {
      toast.error('Please login to follow startups')
      return
    }

    setLoading(true)
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('startup_id', startup.id)
          .eq('user_id', currentUserId)
        toast.success(`Unfollowed ${startup.name}`)
      } else {
        await supabase.from('follows').insert({
          startup_id: startup.id,
          user_id: currentUserId,
        })
        toast.success(`Now following ${startup.name}`)
      }
      setIsFollowing(!isFollowing)
      onFollowChange && onFollowChange()
    } catch (error) {
      toast.error('Failed to update follow status')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S'
  }

  const getDomainLabel = (domain) => {
    const labels = {
      'fintech': 'FinTech',
      'healthtech': 'HealthTech',
      'edtech': 'EdTech',
      'ecommerce': 'E-Commerce',
      'saas': 'SaaS',
      'ai-ml': 'AI/ML',
      'deeptech': 'DeepTech',
      'consumer': 'Consumer',
      'b2b': 'B2B',
    }
    return labels[domain] || domain
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Link href={`/startup/${startup.id}`} className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={startup.logo_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(startup.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold hover:underline">{startup.name}</h3>
              <Badge variant="secondary" className="mt-1">
                {getDomainLabel(startup.domain)}
              </Badge>
            </div>
          </Link>
          <Button
            variant={isFollowing ? 'outline' : 'default'}
            size="sm"
            onClick={handleFollow}
            disabled={loading}
          >
            {isFollowing ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {startup.description}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {startup.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {startup.location}
            </span>
          )}
          {startup.team_size && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {startup.team_size}
            </span>
          )}
          {startup.website && (
            <a
              href={startup.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" />
              Website
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
