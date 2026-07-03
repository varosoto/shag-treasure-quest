alter table public.teams add column if not exists color text;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) - 1 AS n
  FROM public.teams WHERE color IS NULL
)
UPDATE public.teams t SET color =
  (ARRAY['#7a2e3e','#d4a847','#1a6b72','#c1440e','#4a6741',
         '#8b4a6b','#2f5f8f','#c96f4a','#4a8b8b','#8b7355'])
  [(ordered.n % 10) + 1]
FROM ordered WHERE t.id = ordered.id;