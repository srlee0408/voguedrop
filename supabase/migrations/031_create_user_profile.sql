-- Create user_profile table to store editor preferences
-- RLS is disabled; access controlled via server API routes using Service Role

CREATE TABLE IF NOT EXISTS public.user_profile (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overlap_replace_preference TEXT NOT NULL DEFAULT 'ask', -- 'ask' | 'always_replace' | 'never_replace'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profile_user_unique ON public.user_profile(user_id);

-- Disable RLS per MVP policy (API routes will enforce auth)
ALTER TABLE public.user_profile DISABLE ROW LEVEL SECURITY;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profile_updated_at ON public.user_profile;
CREATE TRIGGER trg_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Basic grants for authenticated role (optional read)
GRANT SELECT, INSERT, UPDATE ON public.user_profile TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_profile_id_seq TO authenticated;


