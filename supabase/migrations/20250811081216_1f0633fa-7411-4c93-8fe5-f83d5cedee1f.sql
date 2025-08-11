-- Create feeding_logs table for tracking feeding entries
CREATE TABLE public.feeding_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  location_id UUID,
  tank_id UUID,
  stock_id UUID,
  quantity NUMERIC NOT NULL,
  schedule TEXT,
  fed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feeding_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for feeding_logs
CREATE POLICY "Members can view feeding logs" 
ON public.feeding_logs 
FOR SELECT 
USING (current_user_is_account_member(account_id));

CREATE POLICY "Members can insert feeding logs" 
ON public.feeding_logs 
FOR INSERT 
WITH CHECK (current_user_is_account_member(account_id));

CREATE POLICY "Members can update feeding logs" 
ON public.feeding_logs 
FOR UPDATE 
USING (current_user_is_account_member(account_id))
WITH CHECK (current_user_is_account_member(account_id));

CREATE POLICY "Members can delete feeding logs" 
ON public.feeding_logs 
FOR DELETE 
USING (current_user_is_account_member(account_id));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_feeding_logs_updated_at
BEFORE UPDATE ON public.feeding_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();