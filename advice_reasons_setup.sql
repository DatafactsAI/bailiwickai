-- Create advice_reasons table to store predefined reasons
CREATE TABLE public.advice_reasons (
  id uuid primary key default uuid_generate_v4(),
  reason_text text not null,
  category text,
  created_at timestamptz default now()
);

-- Create client_selected_reasons table to track which reasons a client has selected
CREATE TABLE public.client_selected_reasons (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients_financial_data(id) on delete cascade,
  reason_id uuid references advice_reasons(id) on delete cascade,
  statement text DEFAULT '',
  created_at timestamptz default now(),
  UNIQUE(client_id, reason_id)
);

-- Create permissive RLS policies
create policy "Allow all operations for all users"
  on advice_reasons
  for all
  using (true)
  with check (true);

create policy "Allow all operations for all users"
  on client_selected_reasons
  for all
  using (true)
  with check (true);

-- Insert only the specified reasons for seeking advice
INSERT INTO public.advice_reasons (reason_text, category) VALUES
('Planning for my retirement', 'Retirement'),
('Save more money', 'Wealth Building'),
('Get Insurance', 'Risk Management'),
('Helping Children', 'Family Planning');
