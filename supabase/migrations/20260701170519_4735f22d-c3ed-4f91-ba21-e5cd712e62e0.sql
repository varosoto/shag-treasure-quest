
GRANT ALL ON public.teams TO service_role;
GRANT ALL ON public.submissions TO service_role;
GRANT ALL ON public.dolly_answers TO service_role;
GRANT ALL ON public.tasks TO service_role;

-- Public read access needed by leaderboard/gallery (non-sensitive columns only via column grants)
GRANT SELECT (id, name, created_at) ON public.teams TO anon, authenticated;
GRANT SELECT ON public.submissions TO anon, authenticated;
GRANT SELECT ON public.tasks TO anon, authenticated;
