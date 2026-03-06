-- Find vehicles with NULL published_date
SELECT 
  vehicle_code,
  maker,
  car_name,
  status,
  days_listed,
  days_listed_numeric,
  published_date,
  inserted_at,
  updated_at
FROM public.inventories
WHERE published_date IS NULL
ORDER BY inserted_at DESC;

-- Check if these vehicles have days_listed data
SELECT 
  COUNT(*) as total_vehicles,
  COUNT(published_date) as with_published_date,
  COUNT(*) - COUNT(published_date) as null_published_date,
  COUNT(days_listed_numeric) as with_days_listed
FROM public.inventories;
