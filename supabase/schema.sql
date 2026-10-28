-- =====================================================================
-- BEST-POL Bongi Hurt — schemat bazy (Supabase / Postgres)
-- Wklej całość w Supabase → SQL Editor → Run
-- =====================================================================

-- ---------- KATEGORIE ----------
create table if not exists public.categories (
  id serial primary key,
  slug text unique not null,
  name text not null,
  sort int default 0
);

-- ---------- PRODUKTY (publiczne — BEZ cen) ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,              -- kod produktu / kod z Subiekta
  ean text,
  name text not null,
  description text,
  category_id int references public.categories(id),
  image_url text,
  height_cm numeric,
  material text,                         -- szkło, akryl, silikon...
  pack_qty int not null default 1,       -- minimalna ilość / wielokrotność zamówienia
  in_stock boolean not null default true,
  stock_qty int,                         -- stan na magazynie (szt.)
  group_code text,                       -- produkty z tą samą grupą = jeden produkt z wariantami
  variant_name text,                     -- np. kolor: Zielony, Niebieski
  active boolean not null default true,
  created_at timestamptz default now()
);

-- ---------- CENY (osobna tabela — widoczna tylko dla zatwierdzonych) ----------
create table if not exists public.product_prices (
  product_id uuid primary key references public.products(id) on delete cascade,
  price_net numeric(10,2) not null,      -- cena hurtowa netto za szt.
  vat int not null default 23
);

-- ---------- PROFILE HURTOWNIKÓW / SKLEPÓW ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  company_name text,
  nip text,
  phone text,
  address text,
  approved boolean not null default false,  -- Wy zatwierdzacie konto
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

-- automatyczne tworzenie profilu przy rejestracji
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, company_name, nip, phone, address)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'nip',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address'
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- pomocnicza: czy zalogowany jest zatwierdzony
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

-- ---------- ZAMÓWIENIA ----------
create table if not exists public.orders (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  items jsonb not null,           -- [{sku,name,qty,price_net}]
  total_net numeric(12,2) not null,
  note text,
  status text not null default 'nowe',
  created_at timestamptz default now()
);

-- =====================================================================
-- RLS (zabezpieczenia)
-- =====================================================================
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_prices enable row level security;
alter table public.profiles       enable row level security;
alter table public.orders         enable row level security;

drop policy if exists "kategorie publiczne" on public.categories;
create policy "kategorie publiczne" on public.categories for select using (true);

drop policy if exists "produkty publiczne" on public.products;
create policy "produkty publiczne" on public.products for select using (active);

drop policy if exists "ceny dla zatwierdzonych" on public.product_prices;
create policy "ceny dla zatwierdzonych" on public.product_prices
  for select using (public.is_approved());

drop policy if exists "wlasny profil" on public.profiles;
create policy "wlasny profil" on public.profiles for select using (auth.uid() = id);

drop policy if exists "wlasne zamowienia" on public.orders;
create policy "wlasne zamowienia" on public.orders for select using (auth.uid() = user_id);
-- zamówienia zapisuje tylko serwer (service role), więc brak polityki insert

-- =====================================================================
-- ZDJĘCIA PRODUKTÓW (Supabase Storage, publiczny bucket)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;
-- upload robi panel admina przez podpisany link z serwera, więc nie trzeba dodatkowych polityk

-- =====================================================================
-- ADMIN: po założeniu swojego konta na stronie uruchom (z Twoim mailem):
--   update public.profiles set is_admin = true, approved = true where email = 'imnotmax0@gmail.com';
-- =====================================================================

-- dla bazy założonej starszą wersją schematu:
alter table public.products add column if not exists stock_qty int;
alter table public.products add column if not exists group_code text;
alter table public.products add column if not exists variant_name text;
-- cena brutto z cennika (żeby nie było różnic 1 gr przy przeliczaniu z netto)
alter table public.product_prices add column if not exists price_gross numeric(10,2);
alter table public.orders add column if not exists total_gross numeric(12,2);

-- stan magazynu: zdejmowanie przy zamówieniu (sign -1), zwrot przy anulowaniu (sign +1)
create or replace function public.adjust_stock(p_items jsonb, p_sign int)
returns void language sql security definer set search_path = public as $$
  update public.products p
     set stock_qty = greatest(0, p.stock_qty + p_sign * x.q),
         in_stock  = greatest(0, p.stock_qty + p_sign * x.q) > 0
    from (select i->>'sku' as sku, sum((i->>'qty')::int) as q
            from jsonb_array_elements(p_items) i group by 1) x
   where p.sku = x.sku and p.stock_qty is not null;
$$;
revoke execute on function public.adjust_stock(jsonb, int) from public, anon, authenticated;
