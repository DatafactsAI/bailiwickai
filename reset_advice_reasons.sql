-- First, delete all existing selected reasons (to avoid foreign key constraints)
DELETE FROM public.client_selected_reasons;

-- Then delete all existing advice reasons
DELETE FROM public.advice_reasons;

-- Now insert only the four specified reasons
INSERT INTO public.advice_reasons (reason_text, category) VALUES
('Planning for my retirement', 'Retirement'),
('Save more money', 'Wealth Building'),
('Get Insurance', 'Risk Management'),
('Helping Children', 'Family Planning');
