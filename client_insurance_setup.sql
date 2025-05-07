-- Create client_insurance table
create table public.client_insurance (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients_financial_data(id) on delete cascade,
  name text not null,
  value numeric not null,
  owner text check (owner in ('Client 1', 'Client 2', 'Joint')),
  insurance_type text not null,
  created_at timestamptz default now()
);

-- Create permissive RLS policy
create policy "Allow all operations for all users"
  on client_insurance
  for all
  using (true)
  with check (true);

-- Add total_client_insurance column to clients_financial_data table
ALTER TABLE public.clients_financial_data 
ADD COLUMN IF NOT EXISTS total_client_insurance numeric DEFAULT 0;
