-- Add missing calculated columns that csv_parser.py generates
-- These are derived/calculated fields from the CSV data

ALTER TABLE public.inventories
  ADD COLUMN IF NOT EXISTS price_body_numeric numeric,
  ADD COLUMN IF NOT EXISTS price_total_numeric numeric;

-- Add indexes for the new numeric columns (used for sorting/filtering)
CREATE INDEX IF NOT EXISTS idx_inventories_price_body_numeric 
  ON public.inventories(price_body_numeric);

CREATE INDEX IF NOT EXISTS idx_inventories_price_total_numeric 
  ON public.inventories(price_total_numeric);

-- Comments
COMMENT ON COLUMN public.inventories.price_body_numeric IS 'Calculated numeric body price (from csv_parser)';
COMMENT ON COLUMN public.inventories.price_total_numeric IS 'Calculated numeric total price (from csv_parser)';
