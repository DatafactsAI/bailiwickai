-- Create client_goals_objectives table to store goals and objectives for clients
CREATE TABLE IF NOT EXISTS public.client_goals_objectives (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients_financial_data(id) on delete cascade,
  category text not null, -- 'Retirement', 'Cash Flow', or 'Reduce Debt'
  statement text,
  priority text, -- 'High', 'Medium', or 'Low'
  amount decimal,
  timeframe text, -- 'One Year', 'Up to Three Years', 'Up to Five Years', or 'Longer than Five Years'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create permissive RLS policies
DROP POLICY IF EXISTS "Allow all operations for all users" ON client_goals_objectives;
CREATE POLICY "Allow all operations for all users"
  ON client_goals_objectives
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS client_goals_objectives_client_id_idx 
ON client_goals_objectives(client_id);

-- Create index for category
CREATE INDEX IF NOT EXISTS client_goals_objectives_category_idx 
ON client_goals_objectives(category);
