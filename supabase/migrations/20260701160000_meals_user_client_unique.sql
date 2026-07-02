
-- Support reliable upserts on (user_id, client_id) for cloud meal sync.
ALTER TABLE public.meals DROP CONSTRAINT IF EXISTS meals_user_client_id_unique;

DROP INDEX IF EXISTS public.meals_user_client_id_idx;

ALTER TABLE public.meals
  ADD CONSTRAINT meals_user_client_id_unique UNIQUE (user_id, client_id);
