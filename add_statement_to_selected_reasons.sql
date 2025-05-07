-- Add a statement column to the client_selected_reasons table
ALTER TABLE public.client_selected_reasons 
ADD COLUMN statement text;

-- Update the RLS policy to include the new column
DROP POLICY IF EXISTS "Allow all operations for all users" ON client_selected_reasons;

CREATE POLICY "Allow all operations for all users"
  ON client_selected_reasons
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create an index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS client_selected_reasons_client_id_idx 
ON client_selected_reasons(client_id);
