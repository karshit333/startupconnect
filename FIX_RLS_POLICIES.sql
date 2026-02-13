-- ============================================
-- FIX RLS POLICIES FOR REGISTRATION
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop existing profile policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new permissive policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Drop existing startup policies  
DROP POLICY IF EXISTS "Approved startups are viewable by everyone" ON startups;
DROP POLICY IF EXISTS "Startup owners can insert" ON startups;
DROP POLICY IF EXISTS "Startup owners can update" ON startups;
DROP POLICY IF EXISTS "Admins can delete startups" ON startups;

-- Create new startup policies
CREATE POLICY "Startups are viewable by everyone" 
ON startups FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create startups" 
ON startups FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Startup owners can update their startup" 
ON startups FOR UPDATE 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete startups" 
ON startups FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- DONE! Try registering again.
-- ============================================
