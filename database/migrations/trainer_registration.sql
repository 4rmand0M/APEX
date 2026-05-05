-- ═══════════════════════════════════════════════════════════
-- APEX FITNESS — Update auth trigger for trainers
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );

  -- Si es trainer (entrenador o monitor), insertamos en trainer_profiles
  IF (new.raw_user_meta_data->>'role' = 'trainer') THEN
    INSERT INTO public.trainer_profiles (user_id, specialties, experience_years, hourly_rate)
    VALUES (
      new.id,
      ARRAY[COALESCE(new.raw_user_meta_data->>'specialty', 'Fitness')],
      COALESCE((new.raw_user_meta_data->>'experience_years')::integer, 1),
      0
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
