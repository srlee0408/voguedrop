-- Update video_generations table to use UUID for user_id and link with auth.users

-- Step 1: Drop all existing RLS policies that depend on user_id
DROP POLICY IF EXISTS "Users can view own videos" ON public.video_generations;
DROP POLICY IF EXISTS "Users can insert own videos" ON public.video_generations;
DROP POLICY IF EXISTS "Users can update own videos" ON public.video_generations;
DROP POLICY IF EXISTS "Users can only view own generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can only create own generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can only delete own generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can view their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can create their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can update their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Service role full access" ON public.video_generations;

-- Drop any other policies that might exist
DO $$ 
DECLARE
    drop_commands text;
BEGIN
    -- Drop all policies on video_generations table
    SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.video_generations;', ' ')
    INTO drop_commands
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'video_generations';
    
    IF drop_commands IS NOT NULL THEN
        EXECUTE drop_commands;
    END IF;
END $$;

-- Step 2: Add new UUID column for user_id
ALTER TABLE public.video_generations 
ADD COLUMN user_uuid uuid;

-- Step 3: Check if there are existing records
DO $$
DECLARE
    record_count integer;
BEGIN
    SELECT COUNT(*) INTO record_count FROM public.video_generations;
    IF record_count > 0 THEN
        RAISE NOTICE 'Warning: % existing records will be deleted as they cannot be mapped to auth users', record_count;
    END IF;
END $$;

-- Step 4: Delete all existing records (since we can't map anonymous to auth users)
DELETE FROM public.video_generations;

-- Step 5: Drop the old user_id column
ALTER TABLE public.video_generations 
DROP COLUMN user_id;

-- Step 6: Rename user_uuid to user_id
ALTER TABLE public.video_generations 
RENAME COLUMN user_uuid TO user_id;

-- Step 7: Make user_id NOT NULL since anonymous is not allowed
ALTER TABLE public.video_generations
ALTER COLUMN user_id SET NOT NULL;

-- Step 8: Add foreign key constraint to auth.users
ALTER TABLE public.video_generations
ADD CONSTRAINT video_generations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 9: Create index for better query performance
CREATE INDEX idx_video_generations_user_id ON public.video_generations(user_id);

-- Step 10: Update RLS policies for video_generations
-- Enable RLS
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can create their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can update their own video generations" ON public.video_generations;

-- Create new RLS policies
-- Policy: Users can view their own video generations
CREATE POLICY "Users can view their own video generations" 
ON public.video_generations FOR SELECT 
USING (
  auth.uid() = user_id
);

-- Policy: Users can create video generations
CREATE POLICY "Users can create their own video generations" 
ON public.video_generations FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND auth.uid() IS NOT NULL
);

-- Policy: Users can update their own video generations
CREATE POLICY "Users can update their own video generations" 
ON public.video_generations FOR UPDATE 
USING (
  auth.uid() = user_id
) 
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Users can delete their own video generations
CREATE POLICY "Users can delete their own video generations" 
ON public.video_generations FOR DELETE 
USING (
  auth.uid() = user_id
);

-- Policy: Service role can do everything (for webhooks and backend operations)
CREATE POLICY "Service role full access" 
ON public.video_generations 
FOR ALL 
USING (
  auth.role() = 'service_role'
);

-- Add comment for documentation
COMMENT ON COLUMN public.video_generations.user_id IS 'References auth.users(id). Required - anonymous users not allowed.';