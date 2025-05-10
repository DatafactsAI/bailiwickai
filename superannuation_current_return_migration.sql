-- Add current_return column to superannuation_assets table
ALTER TABLE superannuation_assets ADD COLUMN IF NOT EXISTS current_return NUMERIC;
