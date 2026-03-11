-- Add image columns to inventories table
alter table public.inventories 
add column if not exists main_image_url text,
add column if not exists image_urls text[],
add column if not exists images_scraped_at timestamptz;

-- Create index for image URL lookups
create index if not exists idx_inventories_main_image on public.inventories(main_image_url);

-- Add comment
comment on column public.inventories.main_image_url is 'URL of the primary vehicle image from Car Sensor';
comment on column public.inventories.image_urls is 'Array of all image URLs for the vehicle';
comment on column public.inventories.images_scraped_at is 'Timestamp when images were last scraped';
