-- Add price tracking columns to feeding_logs and material_logs for weighted average cost calculation
ALTER TABLE public.feeding_logs ADD COLUMN price_per_unit numeric DEFAULT 0;
ALTER TABLE public.material_logs ADD COLUMN price_per_unit numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.feeding_logs.price_per_unit IS 'Price per unit at time of feeding (for weighted average cost calculation)';
COMMENT ON COLUMN public.material_logs.price_per_unit IS 'Price per unit at time of material usage (for weighted average cost calculation)';