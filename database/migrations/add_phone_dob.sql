-- Migración: Agregar phone y date_of_birth a profiles
-- Ejecutar en el SQL Editor de Supabase Dashboard

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
