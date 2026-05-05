-- ═══════════════════════════════════════════════════════════
-- APEX FITNESS — Seed Global Exercises
-- Ejecuta este script en el SQL Editor de Supabase para
-- cargar un catálogo inicial de ejercicios.
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.exercises (name, description, muscle_group, equipment, media_url) VALUES 

-- 🟦 PECHO (Chest)
('Press de Banca Plano', 'Ejercicio fundamental para el desarrollo del pectoral mayor. Baja la barra hasta tocar el centro del pecho y empuja de forma explosiva.', 'Pecho', 'Barra y Banco', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400'),
('Press de Banca Inclinado', 'Enfocado en la porción superior (clavicular) del pecho. Usa un ángulo de 30 a 45 grados.', 'Pecho', 'Mancuernas o Barra', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('Aperturas con Mancuernas', 'Aísla los pectorales. Mantén una ligera flexión en los codos y abre los brazos como si fueras a dar un abrazo.', 'Pecho', 'Mancuernas', NULL),
('Cruces en Polea', 'Excelente para bombear al final de la rutina. Cruza las manos en la parte frontal contrayendo el pecho.', 'Pecho', 'Poleas', NULL),
('Flexiones (Push-ups)', 'Ejercicio de peso corporal clásico. Mantén el core apretado y el cuerpo en línea recta.', 'Pecho', 'Peso Corporal', 'https://images.unsplash.com/photo-1598971639058-fab354c6812c?w=400'),

-- 🟪 ESPALDA (Back)
('Dominadas (Pull-ups)', 'Ejercicio rey para la amplitud de la espalda. Tira hasta que la barbilla pase la barra.', 'Espalda', 'Barra de Dominadas', 'https://images.unsplash.com/photo-1598971848529-688941cb9805?w=400'),
('Remo con Barra', 'Constructor de densidad para la espalda media y dorsales. Mantén la espalda recta y el torso a 45 grados.', 'Espalda', 'Barra', NULL),
('Jalón al Pecho', 'Alternativa a las dominadas. Saca pecho y tira de la barra hacia la clavícula.', 'Espalda', 'Máquina de Poleas', 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400'),
('Remo Gironda (Polea Baja)', 'Desarrolla el grosor de la espalda. Tira del agarre hacia el ombligo manteniendo el pecho erguido.', 'Espalda', 'Máquina de Poleas', NULL),
('Pull-over con Mancuerna', 'Expande la caja torácica y trabaja los dorsales. Acuéstate transversal en el banco.', 'Espalda', 'Mancuernas y Banco', NULL),

-- 🟧 PIERNAS (Legs)
('Sentadilla Libre (Squat)', 'El mejor ejercicio compuesto para el tren inferior. Baja hasta romper el paralelo manteniendo la espalda neutral.', 'Piernas', 'Barra y Rack', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('Prensa de Piernas (Leg Press)', 'Permite mover mucho peso aislando las piernas. No bloquees las rodillas al extender.', 'Piernas', 'Máquina Prensa', NULL),
('Zancadas (Lunges)', 'Excelente para glúteos y cuádriceps de forma unilateral. Da un paso largo y baja la rodilla trasera hacia el suelo.', 'Piernas', 'Mancuernas', 'https://images.unsplash.com/photo-1434596922112-19c563067271?w=400'),
('Peso Muerto Rumano', 'Enfocado en isquiotibiales y glúteos. Mantén las piernas semi-rígidas y baja la barra pegada a las espinillas.', 'Piernas', 'Barra', 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400'),
('Curl Femoral Acostado', 'Aísla los isquiotibiales. Contrae al máximo en la parte superior y baja controladamente.', 'Piernas', 'Máquina', NULL),
('Elevación de Talones', 'Para los gemelos (pantorrillas). Sube explosivamente y aguanta un segundo arriba.', 'Piernas', 'Máquina o Peso Libre', NULL),

-- 🟥 HOMBROS (Shoulders)
('Press Militar con Barra', 'Desarrolla fuerza y masa en la porción frontal y media del deltoides. Empuja la barra sobre la cabeza.', 'Hombros', 'Barra', NULL),
('Elevaciones Laterales', 'Aísla la cabeza lateral del hombro para dar ese aspecto en 3D. Mantén el meñique ligeramente apuntando hacia arriba.', 'Hombros', 'Mancuernas', NULL),
('Pájaros (Elevaciones Posteriores)', 'Trabaja la parte posterior del hombro. Inclina el torso hacia adelante y levanta los brazos hacia atrás.', 'Hombros', 'Mancuernas o Máquina', NULL),
('Face Pull', 'Fortalece la parte posterior del hombro y manguito rotador. Tira de la cuerda hacia la altura de tus ojos.', 'Hombros', 'Poleas con Cuerda', NULL),
('Encogimientos (Shrugs)', 'Para el desarrollo de los trapecios. Eleva los hombros como si quisieras tocar tus orejas.', 'Hombros', 'Mancuernas o Barra', NULL),

-- 🟨 BRAZOS (Arms)
('Curl de Bíceps con Barra', 'Constructor masivo para los bíceps. Evita el balanceo del cuerpo.', 'Brazos', 'Barra', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400'),
('Curl Martillo', 'Enfocado en el braquial y antebrazo. Agarre neutro con mancuernas.', 'Brazos', 'Mancuernas', NULL),
('Press Francés', 'Desarrollo de tríceps masivo. Baja la barra Z hacia tu frente acostado en el banco.', 'Brazos', 'Barra Z', NULL),
('Extensión de Tríceps en Polea', 'Aislamiento de tríceps. Extiende completamente el brazo usando una cuerda o barra recta.', 'Brazos', 'Poleas', NULL),
('Fondos en Paralelas (Dips)', 'Excelente para pecho bajo y tríceps. Mantén el cuerpo recto para enfocar más en los tríceps.', 'Brazos', 'Paralelas', NULL),

-- 🟩 CORE / ABDOMINALES (Core)
('Crunch Abdominal', 'Flexiona ligeramente la columna para contraer el recto abdominal sin forzar el cuello.', 'Core', 'Peso Corporal', NULL),
('Plancha (Plank)', 'Fortalece todo el core de forma isométrica. Mantén el cuerpo en línea recta y el abdomen contraído.', 'Core', 'Peso Corporal', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'),
('Elevación de Piernas Colgado', 'Para la zona inferior del abdomen. Cuélgate de una barra y eleva las piernas rectas a 90 grados.', 'Core', 'Barra de Dominadas', NULL),
('Rueda Abdominal (Ab Roller)', 'Ejercicio avanzado de anti-extensión. Rueda hacia adelante hasta quedar paralelo al suelo sin arquear la zona lumbar.', 'Core', 'Rueda Abdominal', NULL),
('Twist Ruso', 'Para los oblicuos. Rota el torso de lado a lado levantando ligeramente las piernas del suelo.', 'Core', 'Disco o Balón Medicinal', NULL)

ON CONFLICT DO NOTHING;
