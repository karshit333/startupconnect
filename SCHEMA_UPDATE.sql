-- ============================================
-- STARTUP CONNECT INDIA - SCHEMA UPDATES
-- New Features: Usernames, Saved Posts, Multi-Image Posts, Message Requests
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD USERNAME TO PROFILES TABLE
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ============================================
-- 2. ADD USERNAME TO STARTUPS TABLE  
-- ============================================
ALTER TABLE startups ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for startup username lookups
CREATE INDEX IF NOT EXISTS idx_startups_username ON startups(username);

-- ============================================
-- 3. UPDATE POSTS TABLE FOR MULTI-IMAGE SUPPORT
-- ============================================
-- Add images array column (stores up to 4 image URLs)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS images TEXT[];

-- Keep image_url for backward compatibility, images array for new posts

-- ============================================
-- 4. SAVED POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id);

-- ============================================
-- 5. UPDATE CONVERSATIONS TABLE FOR MESSAGE REQUESTS
-- ============================================
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_1 INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count_2 INTEGER DEFAULT 0;

-- ============================================
-- 6. UPDATE MESSAGES TABLE FOR READ STATUS
-- ============================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- ============================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================

-- SAVED_POSTS POLICIES
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saved posts" ON saved_posts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts" ON saved_posts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON saved_posts 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- DONE! Schema updates complete.
-- ============================================
