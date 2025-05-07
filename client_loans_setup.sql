-- Create client_loans table
create table public.client_loans (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients_financial_data(id) on delete cascade,
  name text not null,
  value numeric not null,
  owner text check (owner in ('Client 1', 'Client 2', 'Joint')),
  loan_type text not null,
  created_at timestamptz default now()
);

-- Create permissive RLS policy
create policy "Allow all operations for all users"
  on client_loans
  for all
  using (true)
  with check (true);

-- Add total_client_loans column to clients_financial_data table
ALTER TABLE public.clients_financial_data 
ADD COLUMN IF NOT EXISTS total_client_loans numeric DEFAULT 0;
