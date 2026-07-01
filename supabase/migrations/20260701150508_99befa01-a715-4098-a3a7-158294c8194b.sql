
-- TEAMS
DROP POLICY IF EXISTS "public all teams" ON public.teams;
REVOKE ALL ON public.teams FROM anon, authenticated;
GRANT SELECT (id, name, created_at) ON public.teams TO anon, authenticated;
GRANT ALL ON public.teams TO service_role;
CREATE POLICY "public read team name" ON public.teams FOR SELECT TO anon, authenticated USING (true);

-- SUBMISSIONS: public read only, all writes via service role
DROP POLICY IF EXISTS "public all submissions" ON public.submissions;
REVOKE ALL ON public.submissions FROM anon, authenticated;
GRANT SELECT ON public.submissions TO anon, authenticated;
GRANT ALL ON public.submissions TO service_role;
CREATE POLICY "public read submissions" ON public.submissions FOR SELECT TO anon, authenticated USING (true);

-- DOLLY_ANSWERS: only service role
DROP POLICY IF EXISTS "public all dolly" ON public.dolly_answers;
REVOKE ALL ON public.dolly_answers FROM anon, authenticated;
GRANT ALL ON public.dolly_answers TO service_role;
-- (no anon policies — locked)

-- STORAGE: drop permissive submission-photos policies
DROP POLICY IF EXISTS "public read photos" ON storage.objects;
DROP POLICY IF EXISTS "public upload photos" ON storage.objects;
DROP POLICY IF EXISTS "public update photos" ON storage.objects;
