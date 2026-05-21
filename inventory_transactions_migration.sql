BEGIN;

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id BIGSERIAL PRIMARY KEY,
  inventory_id INTEGER NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  meal_plan_id INTEGER REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('meal_plan_deduction', 'restock', 'adjustment')),
  reference_date DATE NOT NULL,
  quantity_before DECIMAL(12,2) NOT NULL,
  change_qty DECIMAL(12,2) NOT NULL,
  quantity_after DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_by_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id
  ON public.inventory_transactions(inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_meal_plan_id
  ON public.inventory_transactions(meal_plan_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference_date
  ON public.inventory_transactions(reference_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_transactions_unique_daily_deduction
  ON public.inventory_transactions(inventory_id, meal_plan_id, movement_type, reference_date)
  WHERE movement_type = 'meal_plan_deduction';

COMMIT;
