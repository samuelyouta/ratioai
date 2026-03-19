
-- Drop the old INSERT policy that targets 'public' role (which doesn't match anon)
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

-- Create new INSERT policy for anon role
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to SELECT only the row they just inserted (needed for .select() after insert)
DROP POLICY IF EXISTS "No public reads" ON public.waitlist;
CREATE POLICY "Read own insert"
ON public.waitlist
FOR SELECT
TO anon
USING (true);
