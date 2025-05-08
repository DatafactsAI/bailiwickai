-- Create the product_recommendations table
CREATE TABLE IF NOT EXISTS product_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_name TEXT,
    amount DECIMAL(10, 2),
    client_allocation TEXT CHECK (client_allocation IN ('Client 1', 'Client 2', 'Joint')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS product_recommendations_client_id_idx ON product_recommendations(client_id);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_recommendations_updated_at
BEFORE UPDATE ON product_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_product_recommendations_updated_at();

-- Add sample data if needed
-- INSERT INTO product_recommendations (client_id, product_name, amount, client_allocation)
-- VALUES 
--   ('client-uuid-here', 'Sample Product 1', 10000.00, 'Client 1'),
--   ('client-uuid-here', 'Sample Product 2', 5000.00, 'Client 2');
