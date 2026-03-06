-- Function to calculate metrics for a single vehicle
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

  -- Calculate stagnation days
  if v_published_date is not null then
    v_stagnation_days := extract(day from (current_date - v_published_date));
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
  from public.price_histories
  where inventory_id = vehicle_id;

  -- Calculate rotation score
  -- Formula: (stagnation_days * 1.0) + ((5 - cvr) * 10.0) + (price_changes * 5.0)
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
end;
$$ language plpgsql security definer;

-- Function to calculate metrics for all vehicles
create or replace function public.calculate_all_metrics()
returns integer as $$
declare
  v_count integer := 0;
  v_vehicle record;
begin
  for v_vehicle in 
    select id from public.inventories
    where status = '販売中'
  loop
    perform public.calculate_vehicle_metrics(v_vehicle.id);
    v_count := v_count + 1;
  end loop;
  
  return v_count;
end;
$$ language plpgsql security definer;

-- Function to track price changes (trigger function)
create or replace function public.track_price_change()
returns trigger as $$
begin
  -- Only track if price_body actually changed
  if old.price_body is distinct from new.price_body then
    insert into public.price_histories (
      inventory_id,
      old_price,
      new_price,
      price_diff,
      price_diff_pct,
      changed_by
    ) values (
      new.id,
      old.price_body,
      new.price_body,
      new.price_body - old.price_body,
      case 
        when old.price_body > 0 then
          round(((new.price_body - old.price_body) / old.price_body) * 100, 2)
        else
          null
      end,
      auth.uid()
    );

    -- Recalculate metrics for this vehicle
    perform public.calculate_vehicle_metrics(new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for price changes
create trigger on_price_change
  after update on public.inventories
  for each row
  when (old.price_body is distinct from new.price_body)
  execute function public.track_price_change();

-- Function to get dashboard stats (optimized query)
create or replace function public.get_dashboard_stats()
returns json as $$
declare
  v_result json;
begin
  select json_build_object(
    'total', count(*),
    'on_sale', count(*) filter (where status = '販売中'),
    'sold', count(*) filter (where status = '売約済'),
    'unpublished', count(*) filter (where status = '非公開'),
    'avg_stagnation', round(avg(
      case 
        when status = '販売中' and published_date is not null 
        then extract(day from (current_date - published_date))
        else null
      end
    )),
    'avg_cvr', round(avg(
      case 
        when detail_views > 0 and email_inquiries is not null
        then (email_inquiries::numeric / detail_views::numeric) * 100
        else null
      end
    ), 2),
    'discount_candidates', count(*) filter (
      where status = '販売中' 
      and (
        extract(day from (current_date - published_date)) >= 60
        or (
          detail_views > 0 
          and email_inquiries is not null
          and (email_inquiries::numeric / detail_views::numeric) * 100 < 2
        )
      )
    )
  ) into v_result
  from public.inventories;

  return v_result;
end;
$$ language plpgsql security definer;

-- Comments
comment on function public.calculate_vehicle_metrics is 'Calculate and update analytics metrics for a single vehicle';
comment on function public.calculate_all_metrics is 'Calculate metrics for all vehicles with status=販売中';
comment on function public.track_price_change is 'Trigger function to automatically log price changes';
comment on function public.get_dashboard_stats is 'Get aggregated dashboard statistics in one query';
