-- Check published_date data in Supabase
-- Run this in Supabase SQL Editor

-- Check sample data
SELECT 
  vehicle_code,
  status,
  days_listed,
  published_date,
  pg_typeof(published_date) as date_type
FROM public.inventories
LIMIT 20;

-- Check for NULL published_dates
SELECT 
  status,
  COUNT(*) as count,
  COUNT(published_date) as with_published_date,
  COUNT(*) - COUNT(published_date) as null_published_dates
FROM public.inventories
GROUP BY status;

-- Check date format issues
SELECT 
  vehicle_code,
  published_date,
  LENGTH(published_date::text) as date_length
FROM public.inventories
WHERE published_date IS NOT NULL
LIMIT 10;
