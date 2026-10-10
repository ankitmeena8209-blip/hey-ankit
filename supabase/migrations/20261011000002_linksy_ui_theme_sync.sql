-- Migration: Add ui_theme column to profiles and secure RPC for syncing active UI look
-- Safe and idempotent: does not widen any profile UPDATE policies or expose role/status

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ui_theme text
CHECK (ui_theme IN ('default', 'rose', 'sapphire', 'lime', 'clay', 'kawaii'))
DEFAULT 'default';

CREATE OR REPLACE FUNCTION public.set_ui_theme(p_theme text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_theme NOT IN ('default', 'rose', 'sapphire', 'lime', 'clay', 'kawaii') THEN
    RAISE EXCEPTION 'Invalid UI theme: %', p_theme;
  END IF;

  UPDATE public.profiles
  SET ui_theme = p_theme
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_ui_theme(text) TO authenticated;
