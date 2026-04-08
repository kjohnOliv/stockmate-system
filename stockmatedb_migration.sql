-- Run this while connected to StockMateDB only.
-- Example:
-- \c "StockMateDB"

BEGIN;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS requested_role VARCHAR(20),
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

UPDATE public.users
SET
  first_name = COALESCE(NULLIF(first_name, ''), split_part(full_name, ' ', 1)),
  last_name = COALESCE(
    NULLIF(last_name, ''),
    NULLIF(regexp_replace(full_name, '^\S+\s*', ''), '')
  ),
  requested_role = COALESCE(NULLIF(requested_role, ''), role)
WHERE full_name IS NOT NULL;

ALTER TABLE IF EXISTS public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE IF EXISTS public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'cook', 'staff', 'user'));

ALTER TABLE IF EXISTS public.users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE IF EXISTS public.users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('pending', 'approved', 'denied', 'active', 'inactive', 'rejected'));

ALTER TABLE IF EXISTS public.users
  DROP CONSTRAINT IF EXISTS users_requested_role_check;

ALTER TABLE IF EXISTS public.users
  ADD CONSTRAINT users_requested_role_check
  CHECK (requested_role IN ('admin', 'cook', 'staff', 'user'));

ALTER TABLE IF EXISTS public.inventory
  ADD COLUMN IF NOT EXISTS name_normalized VARCHAR(120);

UPDATE public.inventory
SET name_normalized = LOWER(TRIM(COALESCE(item, name, '')));

DO $$
BEGIN
  IF EXISTS (
    SELECT LOWER(TRIM(COALESCE(item, name, '')))
    FROM public.inventory
    GROUP BY LOWER(TRIM(COALESCE(item, name, '')))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Duplicate inventory names found. Clean them up before adding the unique constraint.';
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'inventory_unique_item_name'
    ) THEN
      ALTER TABLE public.inventory
        ADD CONSTRAINT inventory_unique_item_name UNIQUE (name_normalized);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_requested_role ON public.users(requested_role);
CREATE INDEX IF NOT EXISTS idx_inventory_name_normalized ON public.inventory(name_normalized);

COMMIT;
