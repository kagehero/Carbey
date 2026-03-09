-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create inventories table (main vehicle data)
create table public.inventories (
  id uuid primary key default uuid_generate_v4(),
  vehicle_code text unique not null,
  management_number text,
  vin text,
  
  -- Basic info
  maker text,
  car_name text,
  grade text,
  grade_notes text,
  year numeric,
  year_month numeric,
  year_display text,
  color text,
  inspection text,
  
  -- Pricing
  price_body numeric,
  price_total numeric,
  price_initial numeric,
  price_body_display text,
  price_total_display text,
  
  -- Mileage
  mileage numeric,
  mileage_display text,
  mileage_numeric numeric,
  
  -- Status
  status text,
  publication_status text,
  stock_status text,
  unpublished_reason text,
  
  -- Dates
  stock_date date,
  published_date date,
  scraped_at timestamptz,
  inserted_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  
  -- C-MATCH specific
  days_listed numeric,
  days_listed_numeric numeric,
  plan_count numeric,
  plan_a text,
  plan_b text,
  image_count numeric,
  caption_count numeric,
  comment1 text,
  comment2 text,
  expanded_frame text,
  other_media_status text,
  
  -- Ratings
  certification_status text,
  rating_overall text,
  rating_interior text,
  rating_exterior text,
  evaluation_expiry text,
  evaluation_published text,
  registered_date text,
  updated_date text,
  
  -- Reuse
  reused_vehicle text,
  reused_days_remaining numeric,
  price_review text,
  inspection_request text,
  
  -- Analytics (denormalized for performance)
  detail_views numeric,
  email_inquiries numeric,
  phone_inquiries numeric,
  map_views numeric,
  favorites numeric,
  
  -- Additional fields for completeness
  index bigint
);

-- Create indexes for inventories
create index idx_inventories_maker on public.inventories(maker);
create index idx_inventories_car_name on public.inventories(car_name);
create index idx_inventories_status on public.inventories(status);
create index idx_inventories_publication_status on public.inventories(publication_status);
create index idx_inventories_published_date on public.inventories(published_date);
create index idx_inventories_price_body on public.inventories(price_body);
create index idx_inventories_inserted_at on public.inventories(inserted_at desc);

-- Create inventory_metrics table (analytics)
create table public.inventory_metrics (
  id uuid primary key default uuid_generate_v4(),
  inventory_id uuid references public.inventories(id) on delete cascade unique not null,
  calculated_at timestamptz default timezone('utc'::text, now()) not null,
  
  -- Calculated metrics
  stagnation_days integer,
  cvr numeric(5,2),
  rotation_score numeric(10,2),
  discount_flag boolean default false,
  
  -- Scoring factors
  views_count integer,
  inquiry_count integer,
  price_change_count integer default 0,
  days_since_price_change integer,
  
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create index for inventory_metrics
create index idx_inventory_metrics_inventory_id on public.inventory_metrics(inventory_id);
create index idx_inventory_metrics_rotation_score on public.inventory_metrics(rotation_score desc);
create index idx_inventory_metrics_discount_flag on public.inventory_metrics(discount_flag) where discount_flag = true;

-- Create price_histories table (price tracking)
create table public.price_histories (
  id uuid primary key default uuid_generate_v4(),
  inventory_id uuid references public.inventories(id) on delete cascade not null,
  old_price numeric not null,
  new_price numeric not null,
  price_diff numeric,
  price_diff_pct numeric(5,2),
  changed_by uuid references auth.users(id),
  changed_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create indexes for price_histories
create index idx_price_histories_inventory_id on public.price_histories(inventory_id);
create index idx_price_histories_changed_at on public.price_histories(changed_at desc);

-- Create user_profiles table (extends auth.users)
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  name text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create index for user_profiles
create index idx_user_profiles_role on public.user_profiles(role);

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger set_updated_at
  before update on public.inventories
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.inventory_metrics
  for each row
  execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.handle_updated_at();

-- Create function to auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, role, name)
  values (new.id, 'viewer', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Comments for documentation
comment on table public.inventories is 'Main vehicle inventory data synced from C-MATCH';
comment on table public.inventory_metrics is 'Calculated analytics metrics for each vehicle';
comment on table public.price_histories is 'Historical record of all price changes';
comment on table public.user_profiles is 'Extended user profile information with roles';
