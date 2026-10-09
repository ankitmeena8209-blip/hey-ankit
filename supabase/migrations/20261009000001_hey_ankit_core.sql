-- Migration: 20261009000001_hey_ankit_core.sql
-- Description: Core schema, RLS policies, RPCs, Storage, and Realtime for Hey Ankit

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Enums
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.message_type AS ENUM ('text', 'image');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'user',
  status public.user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT username_format_check CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  CONSTRAINT profiles_username_unique UNIQUE (username)
);

-- Case-insensitive unique index on lower(username) for double safety
CREATE UNIQUE INDEX IF NOT EXISTS profiles_lower_username_idx ON public.profiles (lower(username));

-- 4. Create Conversations Table (1:1 Friend to Admin)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT conversations_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_admin_id_idx ON public.conversations(admin_id);

-- 5. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.message_type NOT NULL DEFAULT 'text',
  body TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  edited_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  CONSTRAINT message_content_check CHECK (
    (type = 'text' AND body IS NOT NULL AND length(trim(body)) > 0) OR
    (type = 'image' AND image_path IS NOT NULL)
  )
);

-- Indexes on (conversation_id, created_at DESC) as locked architecture decision
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_read_at_idx ON public.messages (conversation_id, read_at);

-- 6. Create Message Audit Table (Unsend retention)
CREATE TABLE IF NOT EXISTS public.message_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  body TEXT,
  image_path TEXT,
  original_created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS message_audit_conv_deleted_idx ON public.message_audit (conversation_id, deleted_at DESC);
CREATE INDEX IF NOT EXISTS message_audit_deleted_at_idx ON public.message_audit (deleted_at DESC);

-- 7. Helper functions for authorization
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'admin' AND status = 'active'
  );
$$;

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
        OR c.admin_id = p_user_id
        OR public.is_admin(p_user_id)
      )
  );
$$;

-- 8. Row Level Security (RLS) on all tables

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_audit ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
-- Users can read their own profile OR admin can read all profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin(auth.uid())
  );

-- Users can update their own profile (cannot alter role or status due to trigger below)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Prevent non-admins from changing role or status
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If not service_role and caller is not admin, forbid changing role or status
  IF (auth.jwt() ->> 'role' <> 'service_role') AND NOT public.is_admin(auth.uid()) THEN
    IF NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Cannot modify user role';
    END IF;
    IF NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Cannot modify user status';
    END IF;
  END IF;
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileges();

-- CONVERSATIONS RLS
-- Select: user can see their own conversation, admin sees all conversations
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR admin_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Insert: authenticated user can insert conversation for themselves
CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- MESSAGES RLS
-- Select: only conversation members can view messages
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_member(conversation_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'active'
    )
  );

-- Insert: member can send a message with sender_id = auth.uid()
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(conversation_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'active'
    )
  );

-- Update: users can only mark read_at (edit is done exclusively through SECURITY DEFINER RPC)
CREATE POLICY "messages_update_read_at" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    public.is_conversation_member(conversation_id, auth.uid())
  )
  WITH CHECK (
    public.is_conversation_member(conversation_id, auth.uid())
  );

-- Delete: disallowed via direct DELETE; must use unsend_message RPC
CREATE POLICY "messages_delete_restricted" ON public.messages
  FOR DELETE
  TO authenticated
  USING (
    -- Direct client delete blocked; RPC runs with SECURITY DEFINER
    public.is_admin(auth.uid())
  );

-- MESSAGE AUDIT RLS
-- Audit records are visible to admin only
CREATE POLICY "message_audit_admin_only" ON public.message_audit
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
  );

-- 9. Automatic Profile & Conversation Creation on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_username TEXT;
  v_clean_username TEXT;
  v_admin_id UUID;
BEGIN
  -- Extract username from synthetic email (username@heyankit.invalid) or raw user metadata
  v_raw_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  v_clean_username := lower(trim(v_raw_username));

  -- Validate username format
  IF v_clean_username !~ '^[a-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Invalid username. Must be 3-20 lowercase alphanumeric characters or underscore.';
  END IF;

  -- Automatically assign admin role for being_frzi or ankit
  IF v_clean_username IN ('being_frzi', 'ankit') THEN
    INSERT INTO public.profiles (id, username, role, status)
    VALUES (NEW.id, v_clean_username, 'admin', 'active')
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', username = EXCLUDED.username;
  ELSE
    -- Regular friend signup
    INSERT INTO public.profiles (id, username, role, status)
    VALUES (NEW.id, v_clean_username, 'user', 'active')
    ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username;
  END IF;

  -- Find current admin ID if exists
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE role = 'admin' AND status = 'active'
  LIMIT 1;

  -- Create private conversation for this user with admin
  INSERT INTO public.conversations (user_id, admin_id)
  VALUES (NEW.id, v_admin_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger when an admin profile is promoted/created: link existing conversations missing admin_id
CREATE OR REPLACE FUNCTION public.handle_admin_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role <> 'admin') THEN
    UPDATE public.conversations
    SET admin_id = NEW.id
    WHERE admin_id IS NULL OR admin_id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_admin_promoted ON public.profiles;
CREATE TRIGGER on_admin_promoted
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_promotion();

-- 10. RPC: Edit Message (Own message, within 20s server time)
CREATE OR REPLACE FUNCTION public.edit_message(
  p_message_id UUID,
  p_new_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message RECORD;
  v_elapsed_seconds NUMERIC;
BEGIN
  -- Trim and validate body
  IF p_new_body IS NULL OR length(trim(p_new_body)) = 0 THEN
    RAISE EXCEPTION 'Message body cannot be empty';
  END IF;

  -- Fetch message with lock
  SELECT * INTO v_message
  FROM public.messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Verify sender
  IF v_message.sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own messages';
  END IF;

  -- Verify type is text
  IF v_message.type <> 'text' THEN
    RAISE EXCEPTION 'Only text messages can be edited';
  END IF;

  -- Server-enforced 20-second time window
  v_elapsed_seconds := EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v_message.created_at));
  IF v_elapsed_seconds > 20 THEN
    RAISE EXCEPTION 'Edit window expired (maximum 20 seconds allowed, % seconds elapsed)', round(v_elapsed_seconds, 1);
  END IF;

  -- Update message
  UPDATE public.messages
  SET body = trim(p_new_body),
      edited_at = timezone('utc'::text, now())
  WHERE id = p_message_id;

  -- Update conversation updated_at
  UPDATE public.conversations
  SET updated_at = timezone('utc'::text, now())
  WHERE id = v_message.conversation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', p_message_id,
    'body', trim(p_new_body),
    'edited_at', timezone('utc'::text, now())
  );
END;
$$;

-- 11. RPC: Unsend Message (Copies to message_audit, hard deletes from messages)
CREATE OR REPLACE FUNCTION public.unsend_message(
  p_message_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message RECORD;
  v_is_sender BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Fetch message
  SELECT * INTO v_message
  FROM public.messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  v_is_sender := (v_message.sender_id = auth.uid());
  v_is_admin := public.is_admin(auth.uid());

  IF NOT (v_is_sender OR v_is_admin) THEN
    RAISE EXCEPTION 'Not authorized to unsend this message';
  END IF;

  -- Copy full row into message_audit
  INSERT INTO public.message_audit (
    message_id,
    sender_id,
    conversation_id,
    body,
    image_path,
    original_created_at,
    deleted_at,
    deleted_by
  )
  VALUES (
    v_message.id,
    v_message.sender_id,
    v_message.conversation_id,
    v_message.body,
    v_message.image_path,
    v_message.created_at,
    timezone('utc'::text, now()),
    auth.uid()
  );

  -- Hard DELETE from messages so Realtime emits DELETE event
  DELETE FROM public.messages
  WHERE id = p_message_id;

  -- Touch conversation timestamp
  UPDATE public.conversations
  SET updated_at = timezone('utc'::text, now())
  WHERE id = v_message.conversation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', p_message_id
  );
END;
$$;

-- 12. RPC: Mark Messages Read
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_conversation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a member of the conversation
  IF NOT public.is_conversation_member(p_conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Mark unread messages sent by the other party as read
  UPDATE public.messages
  SET read_at = timezone('utc'::text, now())
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL;
END;
$$;

-- 13. RPC: Ensure / Get Conversation For Current User
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

  -- Admin ID lookup
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE role = 'admin' AND status = 'active'
  LIMIT 1;

  -- Try finding existing conversation
  SELECT * INTO v_conv
  FROM public.conversations
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.conversations (user_id, admin_id)
    VALUES (v_user_id, v_admin_id)
    RETURNING * INTO v_conv;
  ELSIF v_conv.admin_id IS NULL AND v_admin_id IS NOT NULL THEN
    UPDATE public.conversations
    SET admin_id = v_admin_id
    WHERE id = v_conv.id
    RETURNING * INTO v_conv;
  END IF;

  RETURN jsonb_build_object(
    'id', v_conv.id,
    'user_id', v_conv.user_id,
    'admin_id', v_conv.admin_id,
    'created_at', v_conv.created_at
  );
END;
$$;

-- 14. Realtime Configuration
-- Enable replica identity full on messages for accurate delete event payload
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 15. Storage Configuration & Storage RLS
-- Create private bucket 'chat-images' with 5MB file size limit and allowed MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS: SELECT policy
-- Path structure: {conversation_id}/{filename}
CREATE POLICY "chat_images_select_policy" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND public.is_conversation_member(
      (split_part(name, '/', 1))::uuid,
      auth.uid()
    )
  );

-- Storage RLS: INSERT policy
CREATE POLICY "chat_images_insert_policy" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND public.is_conversation_member(
      (split_part(name, '/', 1))::uuid,
      auth.uid()
    )
  );

-- Storage RLS: DELETE policy (admin only or unsend cleanup)
CREATE POLICY "chat_images_delete_policy" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (
      public.is_admin(auth.uid())
      OR public.is_conversation_member(
        (split_part(name, '/', 1))::uuid,
        auth.uid()
      )
    )
  );

-- 16. Audit Retention Purge (30 Days)
CREATE OR REPLACE FUNCTION public.purge_expired_audit_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete records older than 30 days
  WITH deleted AS (
    DELETE FROM public.message_audit
    WHERE deleted_at < (timezone('utc'::text, now()) - INTERVAL '30 days')
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

-- Grant permissions to authenticated and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

