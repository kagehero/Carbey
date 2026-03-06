-- Check if published_date column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventories'
  AND column_name = 'published_date';

-- If empty result, the column doesn't exist! Add it:
-- ALTER TABLE public.inventories ADD COLUMN IF NOT EXISTS published_date DATE;
