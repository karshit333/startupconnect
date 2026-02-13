# Startup Connect India - PRD & Setup Guide

## Product Overview
Startup Connect India is a LinkedIn-style professional networking platform purpose-built for the Indian startup ecosystem. It enables users to discover, follow, interact with, and message startups, while startup accounts can actively post updates, opportunities, and announcements.

## Features Implemented (MVP)

### 1. Authentication & Onboarding
- Email/password authentication via Supabase Auth
- Choose account type: User (Professional) or Startup
- Profile completion during registration

### 2. User Profiles
- Name, bio, skills, education
- Avatar upload capability
- View followed startups
- Activity timeline

### 3. Startup Profiles
- Logo, name, domain, description
- Stage, team size, location
- Website & socials
- Posts & activity timeline
- Admin approval system

### 4. Feed (LinkedIn-style)
- Startup posts displayed in chronological order
- Like, comment functionality
- Skeleton loaders for smooth loading
- Image support in posts

### 5. Messaging
- 1:1 messaging between users and startups
- LinkedIn-style inbox UI
- Real-time conversation updates

### 6. Events & Alerts
- Event listing page
- Filters by city, event type
- Event types: Hackathons, Pitch events, Workshops, Meetups, Conferences
- Admin-only event creation

### 7. Search & Discovery
- Search startups by name, domain, stage
- Filter by domain and stage
- User search

### 8. Admin Panel
- Approve/reject startup registrations
- Create & manage events
- Platform statistics dashboard
- View all startups and users

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage)
- **Database**: PostgreSQL via Supabase

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ADMIN_EMAIL=admin@example.com
```

## Database Schema
All tables and RLS policies are defined in `/SUPABASE_SETUP.sql`

## Storage Buckets Required
1. `avatars` - For profile pictures (public)
2. `posts` - For post images (public)

## User Roles
1. **user** - Regular professionals (can follow, like, comment, message)
2. **startup** - Organization accounts (can post, be followed)
3. **admin** - Platform administrators (manage startups, events)

## Pages
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/register` - Registration (User/Startup)
- `/feed` - Main feed (authenticated)
- `/profile/[id]` - User profile
- `/startup/[id]` - Startup detail page
- `/my-startup` - Manage your startup (for startup accounts)
- `/search` - Search startups and people
- `/messages` - Messaging inbox
- `/events` - Events listing
- `/admin` - Admin dashboard

## Future Enhancements
- Real-time notifications
- Verified startup badges
- Sponsored posts
- Premium analytics
- Mobile apps
