-- Add cost price (procurement cost) to inventories for safe pricing guardrails
alter table public.inventories
add column if not exists cost_price numeric;

create index if not exists idx_inventories_cost_price on public.inventories(cost_price);

comment on column public.inventories.cost_price is 'Procurement cost (used for price floor / margin guardrails)';
