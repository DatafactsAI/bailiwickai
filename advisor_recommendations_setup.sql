-- Create advisor_recommendations table to store recommendations for clients
CREATE TABLE IF NOT EXISTS public.advisor_recommendations (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients_financial_data(id) on delete cascade,
  recommendation_text text not null,
  position integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create permissive RLS policies
DROP POLICY IF EXISTS "Allow all operations for all users" ON advisor_recommendations;
CREATE POLICY "Allow all operations for all users"
  ON advisor_recommendations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS advisor_recommendations_client_id_idx 
ON advisor_recommendations(client_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS advisor_recommendations_position_idx 
ON advisor_recommendations(position);
