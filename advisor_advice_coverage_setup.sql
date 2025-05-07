-- Create advice_coverage_areas table to store predefined coverage areas
CREATE TABLE public.advice_coverage_areas (
  id uuid primary key default uuid_generate_v4(),
  coverage_text text not null,
  category text,
  created_at timestamptz default now()
);

-- Create client_selected_coverage_areas table to track which coverage areas are selected for a client
CREATE TABLE public.client_selected_coverage_areas (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients_financial_data(id) on delete cascade,
  coverage_area_id uuid references advice_coverage_areas(id) on delete cascade,
  statement text DEFAULT '',
  created_at timestamptz default now(),
  UNIQUE(client_id, coverage_area_id)
);

-- Create permissive RLS policies
create policy "Allow all operations for all users"
  on advice_coverage_areas
  for all
  using (true)
  with check (true);

create policy "Allow all operations for all users"
  on client_selected_coverage_areas
  for all
  using (true)
  with check (true);

-- Insert the specified coverage areas
INSERT INTO public.advice_coverage_areas (coverage_text, category) VALUES
('Superannuation', 'Financial'),
('Centrelink', 'Government Benefits'),
('Cash Flow and Budgeting', 'Money Management'),
('Debt Management', 'Money Management');
