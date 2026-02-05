-- Create turnarounds table
CREATE TABLE public.turnarounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flight_number TEXT NOT NULL,
  date DATE NOT NULL,
  airline TEXT NOT NULL,
  times JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.turnarounds ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (each user sees only their own data)
CREATE POLICY "Users can view their own turnarounds" 
ON public.turnarounds 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own turnarounds" 
ON public.turnarounds 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own turnarounds" 
ON public.turnarounds 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own turnarounds" 
ON public.turnarounds 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_turnarounds_updated_at
BEFORE UPDATE ON public.turnarounds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries by user and date
CREATE INDEX idx_turnarounds_user_date ON public.turnarounds(user_id, date DESC);