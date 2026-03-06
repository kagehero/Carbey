-- Enable Row Level Security
alter table public.inventories enable row level security;
alter table public.inventory_metrics enable row level security;
alter table public.price_histories enable row level security;
alter table public.user_profiles enable row level security;

-- Inventories policies
-- Public can view published vehicles
create policy "Public can view published inventories"
  on public.inventories for select
  using (status = '販売中');

-- Authenticated users can view all
create policy "Authenticated users can view all inventories"
  on public.inventories for select
  to authenticated
  using (true);

-- Only admins can insert
create policy "Admins can insert inventories"
  on public.inventories for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can update
create policy "Admins can update inventories"
  on public.inventories for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can delete
create policy "Admins can delete inventories"
  on public.inventories for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Inventory metrics policies
-- Authenticated users can view
create policy "Authenticated users can view metrics"
  on public.inventory_metrics for select
  to authenticated
  using (true);

-- Service role can manage (for automated calculations)
create policy "Service role can manage metrics"
  on public.inventory_metrics for all
  to service_role
  using (true)
  with check (true);

-- Price histories policies
-- Authenticated users can view
create policy "Authenticated users can view price histories"
  on public.price_histories for select
  to authenticated
  using (true);

-- Only admins can insert (via trigger)
create policy "Admins can insert price histories"
  on public.price_histories for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- User profiles policies
-- Users can view own profile
create policy "Users can view own profile"
  on public.user_profiles for select
  to authenticated
  using (id = auth.uid());

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on public.user_profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Users can update own profile
create policy "Users can update own profile"
  on public.user_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins can update any profile
create policy "Admins can update any profile"
  on public.user_profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Comments
comment on policy "Public can view published inventories" on public.inventories is 'Allow public access to vehicles with status=販売中';
comment on policy "Authenticated users can view all inventories" on public.inventories is 'Allow authenticated users to view all vehicles';
comment on policy "Admins can insert inventories" on public.inventories is 'Only admins can create new vehicles';
comment on policy "Admins can update inventories" on public.inventories is 'Only admins can edit vehicles';
comment on policy "Admins can delete inventories" on public.inventories is 'Only admins can delete vehicles';
