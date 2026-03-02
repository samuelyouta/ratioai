
-- Block all public UPDATE on waitlist (only service role via edge functions should update)
CREATE POLICY "No public updates"
ON public.waitlist
FOR UPDATE
USING (false);

-- Block all public DELETE on waitlist
CREATE POLICY "No public deletes"
ON public.waitlist
FOR DELETE
USING (false);
