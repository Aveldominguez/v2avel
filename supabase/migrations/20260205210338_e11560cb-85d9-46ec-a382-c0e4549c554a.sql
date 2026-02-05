-- Add observations column to turnarounds table
ALTER TABLE public.turnarounds 
ADD COLUMN observations TEXT DEFAULT '';