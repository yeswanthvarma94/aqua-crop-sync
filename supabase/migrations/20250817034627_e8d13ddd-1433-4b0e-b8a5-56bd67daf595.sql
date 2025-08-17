-- Add columns to tanks table to store additional tank details
ALTER TABLE public.tanks 
ADD COLUMN IF NOT EXISTS seed_weight NUMERIC,
ADD COLUMN IF NOT EXISTS pl_size NUMERIC,
ADD COLUMN IF NOT EXISTS total_seed NUMERIC,
ADD COLUMN IF NOT EXISTS area NUMERIC;

-- Add columns to tank_crops table to store crop-specific details
ALTER TABLE public.tank_crops
ADD COLUMN IF NOT EXISTS seed_weight NUMERIC,
ADD COLUMN IF NOT EXISTS pl_size NUMERIC,
ADD COLUMN IF NOT EXISTS total_seed NUMERIC,
ADD COLUMN IF NOT EXISTS area NUMERIC;