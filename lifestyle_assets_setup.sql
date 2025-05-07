-- Create the lifestyle_assets table
create table if not exists public.lifestyle_assets (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients_financial_data(id) on delete cascade,
  name text not null,
  value numeric not null,
  owner text check (owner in ('Client 1', 'Client 2', 'Joint')),
  created_at timestamptz default now()
);

-- Add RLS policies for the table
alter table public.lifestyle_assets enable row level security;

-- Allow all operations for authenticated users
create policy "Allow all operations for authenticated users"
  on public.lifestyle_assets
  for all
  to authenticated
  using (true)
  with check (true);
