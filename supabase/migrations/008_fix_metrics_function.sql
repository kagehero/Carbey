-- Fix calculate_vehicle_metrics function to handle edge cases
create or replace function public.calculate_vehicle_metrics(vehicle_id uuid)
returns void as $$
declare
  v_stagnation_days integer;
  v_cvr numeric(5,2);
  v_rotation_score numeric(10,2);
  v_discount_flag boolean;
  v_views integer;
  v_inquiries integer;
  v_published_date date;
  v_price_changes integer;
begin
  -- Get vehicle data
  select 
    published_date,
    detail_views,
    email_inquiries
  into 
    v_published_date,
    v_views,
    v_inquiries
  from public.inventories
  where id = vehicle_id;

  -- Calculate stagnation days (FIXED: handle null dates properly)
  if v_published_date is not null then
    -- Use date subtraction which returns interval, then extract days
    v_stagnation_days := extract(day from age(current_date, v_published_date));
  else
    v_stagnation_days := 0;
  end if;

  -- Calculate CVR
  if v_views > 0 and v_inquiries is not null then
    v_cvr := round((v_inquiries::numeric / v_views::numeric) * 100, 2);
  else
    v_cvr := 0;
  end if;

  -- Get price change count
  select count(*) into v_price_changes
  from public.price_history
  where vehicle_id = vehicle_id;

  -- Calculate rotation score
  v_rotation_score := (v_stagnation_days * 1.0) + ((5 - v_cvr) * 10.0) + (v_price_changes * 5.0);

  -- Determine discount flag
  v_discount_flag := (v_stagnation_days >= 60) or (v_cvr < 2.0 and v_cvr > 0);

  -- Upsert metrics
  insert into public.inventory_metrics (
    inventory_id,
    stagnation_days,
    cvr,
    rotation_score,
    discount_flag,
    views_count,
    inquiry_count,
    price_change_count
  ) values (
    vehicle_id,
    v_stagnation_days,
    v_cvr,
    v_rotation_score,
    v_discount_flag,
    v_views,
    v_inquiries,
    v_price_changes
  )
  on conflict (inventory_id) do update set
    stagnation_days = excluded.stagnation_days,
    cvr = excluded.cvr,
    rotation_score = excluded.rotation_score,
    discount_flag = excluded.discount_flag,
    views_count = excluded.views_count,
    inquiry_count = excluded.inquiry_count,
    price_change_count = excluded.price_change_count,
    calculated_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now());

exception
  when others then
    -- Log error but don't fail the transaction
    raise warning 'Failed to calculate metrics for vehicle %: %', vehicle_id, SQLERRM;
end;
$$ language plpgsql;
