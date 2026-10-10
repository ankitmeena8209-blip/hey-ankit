-- Migration: 20261011000001_linksy_multi_user.sql
-- Description: Multi-User Chat Architecture, User Profiles, Unique Conversations, and RLS for Linksy (by FRZI TOOLS)

-- 1. Extend Profiles Table for Multi-User Discovery
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Update Profiles RLS: Allow authenticated users to search/read active profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_active" ON public.profiles;

CREATE POLICY "profiles_select_active" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    OR id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Ensure users can update their own profile (display_name, avatar_url, bio)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Update Conversations Table for Multi-User 1:1 Messaging
-- Remove the legacy single conversation per user restriction
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_id_unique;

-- Add recipient_id column for general peer-to-peer 1:1 conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Backfill recipient_id from existing admin_id for historical conversations
UPDATE public.conversations
SET recipient_id = admin_id
WHERE recipient_id IS NULL AND admin_id IS NOT NULL;

-- Keep admin_id populated for backward compatibility with existing queries
UPDATE public.conversations
SET admin_id = recipient_id
WHERE admin_id IS NULL AND recipient_id IS NOT NULL;

-- Indexes for fast conversation lookup by participant
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_recipient_id_idx ON public.conversations(recipient_id);
CREATE INDEX IF NOT EXISTS conversations_admin_id_idx ON public.conversations(admin_id);

-- Enforce EXACTLY ONE conversation between any two registered users (prevents duplicate threads)
CREATE UNIQUE INDEX IF NOT EXISTS unique_conversation_pair_idx 
ON public.conversations (
  LEAST(user_id, COALESCE(recipient_id, admin_id)), 
  GREATEST(user_id, COALESCE(recipient_id, admin_id))
);

-- 4. Update Conversation Membership Function
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conv_id
      AND (
        c.user_id = p_user_id
        OR c.recipient_id = p_user_id
        OR c.admin_id = p_user_id
        OR public.is_admin(p_user_id)
      )
  );
$$;

-- 5. Update Conversations RLS Policies
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR recipient_id = auth.uid()
    OR admin_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR recipient_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- 6. RPC: Get or Create Private Conversation with Any Registered User (Reuses Existing)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_other_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_conv RECORD;
  v_other_profile RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  -- Verify other user exists and is active
  SELECT * INTO v_other_profile
  FROM public.profiles
  WHERE id = p_other_user_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or inactive';
  END IF;

  -- Check if conversation already exists in either direction
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE (user_id = v_user_id AND (recipient_id = p_other_user_id OR admin_id = p_other_user_id))
     OR (user_id = p_other_user_id AND (recipient_id = v_user_id OR admin_id = v_user_id))
  LIMIT 1;

  -- Create conversation if it does not exist
  IF NOT FOUND THEN
    INSERT INTO public.conversations (user_id, recipient_id, admin_id)
    VALUES (v_user_id, p_other_user_id, p_other_user_id)
    RETURNING * INTO v_conv;
  END IF;

  RETURN jsonb_build_object(
    'id', v_conv.id,
    'user_id', v_conv.user_id,
    'recipient_id', COALESCE(v_conv.recipient_id, v_conv.admin_id),
    'admin_id', v_conv.admin_id,
    'created_at', v_conv.created_at,
    'updated_at', v_conv.updated_at
  );
END;
$$;

-- 7. RPC: Backward-compatible get_or_create_my_conversation (for chatting with owner / admin)
CREATE OR REPLACE FUNCTION public.get_or_create_my_conversation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
  v_conv RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lookup active admin ID
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE role = 'admin' AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    v_admin_id := v_user_id;
  END IF;

  -- If caller is the admin, return the latest conversation with any user if available
  IF v_user_id = v_admin_id THEN
    SELECT * INTO v_conv
    FROM public.conversations
    WHERE user_id <> v_admin_id OR recipient_id <> v_admin_id
    ORDER BY updated_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'id', v_conv.id,
        'user_id', v_conv.user_id,
        'recipient_id', COALESCE(v_conv.recipient_id, v_conv.admin_id),
        'admin_id', v_conv.admin_id,
        'created_at', v_conv.created_at,
        'updated_at', v_conv.updated_at
      );
    END IF;
  END IF;

  -- Check if conversation already exists with admin
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE (user_id = v_user_id AND (recipient_id = v_admin_id OR admin_id = v_admin_id))
     OR (user_id = v_admin_id AND (recipient_id = v_user_id OR admin_id = v_user_id))
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.conversations (user_id, recipient_id, admin_id)
    VALUES (v_user_id, v_admin_id, v_admin_id)
    RETURNING * INTO v_conv;
  ELSIF v_conv.recipient_id IS NULL AND v_admin_id IS NOT NULL THEN
    UPDATE public.conversations
    SET recipient_id = v_admin_id, admin_id = v_admin_id
    WHERE id = v_conv.id
    RETURNING * INTO v_conv;
  END IF;

  RETURN jsonb_build_object(
    'id', v_conv.id,
    'user_id', v_conv.user_id,
    'recipient_id', COALESCE(v_conv.recipient_id, v_conv.admin_id),
    'admin_id', v_conv.admin_id,
    'created_at', v_conv.created_at,
    'updated_at', v_conv.updated_at
  );
END;
$$;

-- 8. Storage Configuration for Avatars (Public bucket for profile photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$ BEGIN
  CREATE POLICY "avatars_select_policy" ON storage.objects
    FOR SELECT TO authenticated, anon
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_insert_policy" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_update_policy" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars')
    WITH CHECK (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 9. Realtime Publication Configuration
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 10. Grant Execute Permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_my_conversation() TO authenticated, service_role;

-- 11. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
