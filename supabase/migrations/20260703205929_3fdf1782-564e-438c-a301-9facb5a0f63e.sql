ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
UPDATE public.tasks SET hidden = true WHERE id = 'stop-03';