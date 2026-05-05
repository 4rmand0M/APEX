-- ═══════════════════════════════════════════════════════════
-- APEX FITNESS — Policies for Gym CRUD
-- Allow admins/trainers to INSERT, UPDATE, DELETE gyms
-- ═══════════════════════════════════════════════════════════

-- INSERT: admins and trainers can add gyms
DROP POLICY IF EXISTS "Admins can insert gyms" ON public.gyms;
CREATE POLICY "Admins can insert gyms" ON public.gyms
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'trainer')
    )
  );

-- UPDATE: admins and trainers can update gyms
DROP POLICY IF EXISTS "Admins can update gyms" ON public.gyms;
CREATE POLICY "Admins can update gyms" ON public.gyms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'trainer')
    )
  );

-- DELETE: admins and trainers can delete gyms
DROP POLICY IF EXISTS "Admins can delete gyms" ON public.gyms;
CREATE POLICY "Admins can delete gyms" ON public.gyms
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'trainer')
    )
  );
