-- Migration: 20261010000001_admin_user_management.sql
-- Description: RPC functions for admin user deletion and status toggle without requiring Edge Functions

-- 1. Admin Delete User (Permanently removes from auth.users and public.profiles)
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Not authorized as admin';
  END IF;

  IF p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  -- Delete from auth.users (cascades to profiles, conversations, messages, audit)
  DELETE FROM auth.users WHERE id = p_target_user_id;

  -- Ensure deleted from public.profiles if auth trigger was disconnected
  DELETE FROM public.profiles WHERE id = p_target_user_id;

  RETURN jsonb_build_object('success', true, 'deleted_id', p_target_user_id);
END;
$$;

-- 2. Admin Set User Status (Active / Disabled)
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_target_user_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Not authorized as admin';
  END IF;

  IF p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot modify your own status';
  END IF;

  UPDATE public.profiles
  SET status = p_status::public.user_status,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

-- 3. Grant execute permissions to authenticated users (functions enforce is_admin internally)
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(UUID, TEXT) TO authenticated, service_role;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
