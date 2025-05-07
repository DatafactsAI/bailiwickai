-- Create investment_assets table
create table public.investment_assets (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients_financial_data(id) on delete cascade,
  name text not null,
  value numeric not null,
  owner text check (owner in ('Client 1', 'Client 2', 'Joint')),
  asset_type text not null,
  created_at timestamptz default now()
);

-- Create permissive RLS policy
create policy "Allow all operations for all users"
  on investment_assets
  for all
  using (true)
  with check (true);
