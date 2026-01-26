-- Clean up existing tables if re-running migration
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.product_media cascade;
drop table if exists public.products cascade;

-- Create helper function for admin check
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'ADMIN'
  );
$$ language sql security definer;

-- Create products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  title text not null,
  slug text not null unique,
  price integer not null,
  sale_price integer,
  stock integer default 0,
  status text not null check (status in ('draft', 'active', 'archived')) default 'draft',
  short_description text,
  description_json jsonb,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PRODUCT RLS
alter table public.products enable row level security;

create policy "Public can view products"
  on public.products
  for select
  using (true);

create policy "Admins can manage products"
  on public.products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Create product_media junction table
create table public.product_media (
  product_id uuid not null references public.products(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  sort_order integer default 0,
  primary key (product_id, media_id)
);

-- PRODUCT_MEDIA RLS (inherit from products basically, or just admin manage)
alter table public.product_media enable row level security;

create policy "Public can view product media"
  on public.product_media
  for select
  using (true);

create policy "Admins can manage product media"
  on public.product_media
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Create orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('pending', 'paid', 'shipped', 'cancelled', 'refunded')) default 'pending',
  total integer not null,
  stripe_session_id text unique,
  customer_details jsonb,
  created_at timestamptz default now()
);

-- ORDERS RLS
alter table public.orders enable row level security;

create policy "Users can view own orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Service Role manages orders"
  on public.orders
  for all
  to service_role
  using (true)
  with check (true);

-- Create order_items table
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null,
  price_at_purchase integer not null
);

-- ORDER_ITEMS RLS
alter table public.order_items enable row level security;

create policy "Users can view own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Service Role manages order items"
  on public.order_items
  for all
  to service_role
  using (true)
  with check (true);

-- Indexes for performance
create index idx_products_slug on public.products(slug);
create index idx_orders_user_id on public.orders(user_id);
create index idx_order_items_order_id on public.order_items(order_id);
create index idx_product_media_product_id on public.product_media(product_id);

-- Grants
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;
grant all on table public.products to service_role;

grant select on table public.product_media to anon, authenticated;
grant insert, update, delete on table public.product_media to authenticated;
grant all on table public.product_media to service_role;

grant select, insert on table public.orders to authenticated;
grant select, insert on table public.orders to anon;
grant update on table public.orders to authenticated;
grant all on table public.orders to service_role;

grant select, insert on table public.order_items to authenticated;
grant select, insert on table public.order_items to anon;
grant all on table public.order_items to service_role;
