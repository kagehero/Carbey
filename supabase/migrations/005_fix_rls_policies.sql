-- Fix: Remove circular RLS policies and create simpler ones

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;

-- Create simpler policies without recursion

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow users to update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()));

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role full access"
  ON public.user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON POLICY "Users can view own profile" ON public.user_profiles IS 'Users can read their own profile without recursion';
COMMENT ON POLICY "Users can update own profile" ON public.user_profiles IS 'Users can update their profile but not change their role';
COMMENT ON POLICY "Service role full access" ON public.user_profiles IS 'Service role has full access for admin operations';
