-- Add total_superannuation_assets column to clients_financial_data table
ALTER TABLE public.clients_financial_data 
ADD COLUMN IF NOT EXISTS total_superannuation_assets numeric DEFAULT 0;
