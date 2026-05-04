-- ==============================================================================
-- APEX FITNESS - SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONES Y CONFIGURACIÓN INICIAL
-- ==============================================================================
-- Aseguramos que la extensión pgcrypto esté disponible (útil para UUIDs si no usamos auth.uid() directamente)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLAS DEL SISTEMA
-- ==============================================================================

-- 2.1 PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,                    -- Teléfono del usuario
    date_of_birth DATE,            -- Fecha de nacimiento
    weight DECIMAL(5,2), -- Peso actual en kg
    height DECIMAL(5,2), -- Altura en cm
    imc DECIMAL(5,2),    -- Índice de masa corporal
    fitness_goal TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'trainer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 HISTORIAL DE MEDIDAS (Peso, IMC)
CREATE TABLE IF NOT EXISTS public.user_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    height DECIMAL(5,2),            -- Altura en cm usada en el cálculo
    body_fat_percentage DECIMAL(5,2),
    imc DECIMAL(5,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 EJERCICIOS (Catálogo Global)
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    muscle_group TEXT NOT NULL,
    equipment TEXT,
    media_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Si es null, es un ejercicio global del sistema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 RUTINAS
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    difficulty_level TEXT CHECK (difficulty_level IN ('Principiante', 'Intermedio', 'Avanzado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 RUTINA - EJERCICIOS (Relación N:M con detalles)
CREATE TABLE IF NOT EXISTS public.routine_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
    "order" INTEGER NOT NULL,
    target_sets INTEGER,
    target_reps TEXT, -- Texto para permitir "10-12" o fallos
    rest_time_seconds INTEGER,
    UNIQUE(routine_id, "order")
);

-- 2.6 SESIONES DE ENTRENAMIENTO (Historial General)
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    total_duration_minutes INTEGER,
    total_volume DECIMAL(10,2) DEFAULT 0, -- Suma de peso x repeticiones total
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.7 REGISTRO DE SERIES (Logs exactos del entrenamiento)
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
    set_number INTEGER NOT NULL,
    reps_completed INTEGER NOT NULL,
    weight_used DECIMAL(7,2) NOT NULL,
    is_pr BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.8 COMUNIDAD (Publicaciones)
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL, -- Para compartir entrenos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.9 COMUNIDAD (Comentarios)
CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.10 COMUNIDAD (Likes)
CREATE TABLE IF NOT EXISTS public.community_likes (
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- 2.11 CHAT (Conversaciones)
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.12 CHAT (Participantes)
CREATE TABLE IF NOT EXISTS public.chat_participants (
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- 2.13 CHAT (Mensajes)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.14 GIMNASIOS
CREATE TABLE IF NOT EXISTS public.gyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    media_url TEXT,
    facilities TEXT[], -- ej: {'Piscina', 'Sauna', 'Pesas libres'}
    rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.15 ENTRENADORES (Detalles extra al perfil de usuario normal)
CREATE TABLE IF NOT EXISTS public.trainer_profiles (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    specialties TEXT[], -- ej: {'Hipertrofia', 'Crossfit'}
    hourly_rate DECIMAL(7,2),
    rating DECIMAL(3,2) DEFAULT 0,
    experience_years INTEGER,
    verified BOOLEAN DEFAULT false
);

-- ==============================================================================
-- 3. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==============================================================================

-- 3.1 Función: Crear perfil al registrar un usuario en Auth
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
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Trigger: Asignar función a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3.3 Función: Actualizar campo 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3.4 Triggers de 'updated_at' en tablas relevantes
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURIDAD
-- ==============================================================================

-- Habilitar RLS en todas las tablas importantes
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- 4.1 Perfiles: Cualquiera puede ver los perfiles, pero solo el dueño puede editar el suyo
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4.2 Medidas: Solo el usuario puede ver y editar sus propias medidas (peso, IMC)
CREATE POLICY "Users view own measurements." ON public.user_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own measurements." ON public.user_measurements FOR ALL USING (auth.uid() = user_id);

-- 4.3 Ejercicios: Todos pueden verlos. Los del sistema no tienen dueño. Usuarios pueden crear los suyos.
CREATE POLICY "Exercises are viewable by everyone." ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Users can create own exercises." ON public.exercises FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 4.4 Rutinas: El usuario solo ve y edita sus propias rutinas.
CREATE POLICY "Users view own routines." ON public.routines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own routines." ON public.routines FOR ALL USING (auth.uid() = user_id);

-- 4.5 Ejercicios de Rutina: Solo el dueño de la rutina puede ver y editar sus ejercicios
CREATE POLICY "Users manage exercises of own routines." ON public.routine_exercises
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.routines WHERE id = routine_id AND user_id = auth.uid())
);

-- 4.6 Historial de Entrenamiento (Sessions y Logs): Exclusivo para el usuario
CREATE POLICY "Users manage own workout sessions." ON public.workout_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own workout logs." ON public.workout_logs 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- 4.7 Comunidad: Todos ven, pero solo el autor edita/borra
CREATE POLICY "Community posts viewable by everyone." ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Users manage own posts." ON public.community_posts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Comments viewable by everyone." ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "Users manage own comments." ON public.community_comments FOR ALL USING (auth.uid() = user_id);

-- 4.8 Gimnasios: Todos ven. (Solo admins insertan, asumimos que no se necesita política compleja por ahora)
CREATE POLICY "Gyms are viewable by everyone." ON public.gyms FOR SELECT USING (true);

-- ==============================================================================
-- 5. INSERCIÓN DE DATOS DE PRUEBA (OPCIONAL)
-- ==============================================================================
-- Inserción de algunos ejercicios básicos como referencia
INSERT INTO public.exercises (name, description, muscle_group, equipment) VALUES
('Press de Banca', 'Ejercicio principal para el desarrollo del pectoral mayor.', 'Pecho', 'Barra'),
('Sentadillas', 'El rey de los ejercicios para el tren inferior.', 'Piernas', 'Barra'),
('Dominadas', 'Excelente para el desarrollo de la amplitud de la espalda.', 'Espalda', 'Peso Corporal'),
('Curl de Bíceps', 'Aislamiento de los flexores del codo.', 'Brazos', 'Mancuernas')
ON CONFLICT DO NOTHING;

/* ══════════════════════════════════════════════════════════
   PERSONAL PROGRESS TABLE
   Para guardar datos de progreso manuales de cada usuario
   Uso: Solo el dueño puede ver y gestionar sus propios datos.
══════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS public.personal_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
    weight_used DECIMAL(10,2) NOT NULL,
    reps_completed INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.personal_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own personal progress" ON public.personal_progress;
CREATE POLICY "Users can manage their own personal progress" 
ON public.personal_progress 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
/* ══════════════════════════════════════════════════════════
   BODY TRACKING TABLE
   Para guardar análisis corporales detallados (peso, grasa, medidas)
══════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS public.body_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    weight DECIMAL(5,2),
    body_fat DECIMAL(5,2),
    muscle_mass DECIMAL(5,2),
    body_water DECIMAL(5,2),
    neck DECIMAL(5,2),
    chest DECIMAL(5,2),
    waist DECIMAL(5,2),
    hip DECIMAL(5,2),
    biceps_left DECIMAL(5,2),
    biceps_right DECIMAL(5,2),
    thigh_left DECIMAL(5,2),
    thigh_right DECIMAL(5,2),
    calf_left DECIMAL(5,2),
    calf_right DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.body_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own body tracking" ON public.body_tracking;
CREATE POLICY "Users can manage their own body tracking" 
ON public.body_tracking 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
