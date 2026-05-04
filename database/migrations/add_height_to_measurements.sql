-- Migración: Agregar columna height a user_measurements
-- Ejecutar en el SQL Editor de Supabase Dashboard

ALTER TABLE public.user_measurements ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);
