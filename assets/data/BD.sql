-- ============================================================
--  APEX FITNESS APP — PostgreSQL para Supabase
--  ORDEN CORRECTO DE DEPENDENCIAS
-- ============================================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
--  ENUMS
-- ============================================================
CREATE TYPE genero_tipo        AS ENUM ('masculino','femenino','otro','prefiero_no_decir');
CREATE TYPE estado_usuario     AS ENUM ('activo','inactivo','suspendido','pendiente');
CREATE TYPE token_tipo         AS ENUM ('access','refresh','reset_password','verify_email');
CREATE TYPE resultado_tipo     AS ENUM ('exitoso','fallido','error');
CREATE TYPE categoria_imc      AS ENUM ('bajo_peso','normal','sobrepeso','obesidad_i','obesidad_ii','obesidad_iii');
CREATE TYPE nivel_dificultad   AS ENUM ('principiante','intermedio','avanzado','elite');
CREATE TYPE tipo_medida        AS ENUM ('repeticiones','tiempo','distancia','peso_repeticiones');
CREATE TYPE estado_ejercicio   AS ENUM ('activo','inactivo','revision');
CREATE TYPE musculo_tipo       AS ENUM ('primario','secundario');
CREATE TYPE objetivo_rutina    AS ENUM ('fuerza','hipertrofia','resistencia','perdida_peso','definicion','rehabilitacion','general');
CREATE TYPE estado_rutina      AS ENUM ('activa','inactiva','borrador','archivada');
CREATE TYPE estado_sesion      AS ENUM ('en_progreso','completada','cancelada','pausada');
CREATE TYPE estado_gimnasio    AS ENUM ('activo','inactivo','temporal_cerrado');
CREATE TYPE estado_entrenador  AS ENUM ('activo','inactivo','licencia');
CREATE TYPE estado_asignacion  AS ENUM ('activo','inactivo','pendiente');
CREATE TYPE notificacion_tipo  AS ENUM ('sesion_recordatorio','meta_lograda','nuevo_entrenador','sistema','promo');
CREATE TYPE meta_tipo          AS ENUM ('peso_objetivo','imc_objetivo','sesiones_semana','calorias_semana','ejercicio_especifico');
CREATE TYPE estado_meta        AS ENUM ('activa','completada','cancelada','expirada');

-- ============================================================
--  1. ROLES Y PERMISOS  (sin dependencias externas)
-- ============================================================
CREATE TABLE roles (
    id            SMALLSERIAL   PRIMARY KEY,
    nombre        VARCHAR(50)   NOT NULL,
    descripcion   VARCHAR(255),
    nivel_acceso  SMALLINT      NOT NULL CHECK (nivel_acceso BETWEEN 1 AND 10),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_roles_nombre UNIQUE (nombre)
);

CREATE TABLE permisos (
    id          SMALLSERIAL   PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    descripcion VARCHAR(255),
    modulo      VARCHAR(50)   NOT NULL,
    CONSTRAINT uq_permisos_nombre UNIQUE (nombre)
);
CREATE INDEX idx_permisos_modulo ON permisos (modulo);

CREATE TABLE rol_permiso (
    rol_id      SMALLINT NOT NULL REFERENCES roles    (id) ON DELETE CASCADE,
    permiso_id  SMALLINT NOT NULL REFERENCES permisos (id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

-- ============================================================
--  2. USUARIOS  (depende de: roles)
-- ============================================================
CREATE TABLE usuarios (
    id                 BIGSERIAL      PRIMARY KEY,
    uuid               UUID           NOT NULL DEFAULT uuid_generate_v4(),
    nombre             VARCHAR(100)   NOT NULL,
    apellido           VARCHAR(100)   NOT NULL,
    email              VARCHAR(255)   NOT NULL,
    password_hash      VARCHAR(255)   NOT NULL,
    fecha_nacimiento   DATE           NOT NULL,
    genero             genero_tipo,
    telefono           VARCHAR(20),
    avatar_url         VARCHAR(500),
    rol_id             SMALLINT       NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    estado             estado_usuario NOT NULL DEFAULT 'pendiente',
    email_verificado   BOOLEAN        NOT NULL DEFAULT FALSE,
    ultimo_login       TIMESTAMPTZ,
    intentos_fallidos  SMALLINT       NOT NULL DEFAULT 0,
    bloqueado_hasta    TIMESTAMPTZ,
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ,
    CONSTRAINT uq_usuarios_uuid  UNIQUE (uuid),
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT ck_edad_minima    CHECK (DATE_PART('year', AGE(fecha_nacimiento)) >= 14)
);
CREATE INDEX idx_usuarios_rol_id            ON usuarios (rol_id);
CREATE INDEX idx_usuarios_estado            ON usuarios (estado);
CREATE INDEX idx_usuarios_email_verificado  ON usuarios (email_verificado);
CREATE INDEX idx_usuarios_activos           ON usuarios (id) WHERE deleted_at IS NULL;

-- ============================================================
--  3. TOKENS  (depende de: usuarios)
-- ============================================================
CREATE TABLE tokens_sesion (
    id          BIGSERIAL     PRIMARY KEY,
    usuario_id  BIGINT        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token_hash  VARCHAR(512)  NOT NULL,
    tipo        token_tipo    NOT NULL,
    ip_origen   VARCHAR(45),
    user_agent  VARCHAR(500),
    expira_en   TIMESTAMPTZ   NOT NULL,
    revocado    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tokens_usuario_id ON tokens_sesion (usuario_id);
CREATE INDEX idx_tokens_token_hash ON tokens_sesion (token_hash);
CREATE INDEX idx_tokens_expira_en  ON tokens_sesion (expira_en);
CREATE INDEX idx_tokens_activos    ON tokens_sesion (usuario_id) WHERE revocado = FALSE;

-- ============================================================
--  4. MÉTRICAS FÍSICAS  (depende de: usuarios)
-- ============================================================
CREATE TABLE metricas_fisicas (
    id                 BIGSERIAL      PRIMARY KEY,
    usuario_id         BIGINT         NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    fecha_medicion     DATE           NOT NULL DEFAULT CURRENT_DATE,
    peso_kg            NUMERIC(5,2)   CHECK (peso_kg > 0),
    altura_cm          NUMERIC(5,2)   CHECK (altura_cm > 0),
    imc                NUMERIC(5,2)   GENERATED ALWAYS AS (
                           CASE
                               WHEN peso_kg IS NOT NULL AND altura_cm IS NOT NULL AND altura_cm > 0
                               THEN ROUND(peso_kg / POWER(altura_cm / 100.0, 2)::NUMERIC, 2)
                               ELSE NULL
                           END
                       ) STORED,
    categoria_imc      categoria_imc,
    porcentaje_grasa   NUMERIC(5,2)   CHECK (porcentaje_grasa BETWEEN 0 AND 100),
    masa_muscular_kg   NUMERIC(5,2)   CHECK (masa_muscular_kg > 0),
    cintura_cm         NUMERIC(5,2),
    cadera_cm          NUMERIC(5,2),
    pecho_cm           NUMERIC(5,2),
    brazo_cm           NUMERIC(5,2),
    notas              TEXT,
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_metricas_usuario_id    ON metricas_fisicas (usuario_id);
CREATE INDEX idx_metricas_fecha         ON metricas_fisicas (fecha_medicion);
CREATE INDEX idx_metricas_usuario_fecha ON metricas_fisicas (usuario_id, fecha_medicion DESC);

-- ============================================================
--  5. EJERCICIOS  (depende de: usuarios)
-- ============================================================
CREATE TABLE categorias_ejercicio (
    id          SMALLSERIAL   PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    descripcion TEXT,
    icono_url   VARCHAR(500),
    color_hex   CHAR(7)       CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT uq_cat_ejercicio_nombre UNIQUE (nombre)
);

CREATE TABLE grupos_musculares (
    id          SMALLSERIAL   PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    descripcion VARCHAR(255),
    imagen_url  VARCHAR(500),
    CONSTRAINT uq_grupo_muscular_nombre UNIQUE (nombre)
);

CREATE TABLE equipamiento (
    id          SMALLSERIAL   PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    descripcion VARCHAR(255),
    CONSTRAINT uq_equipamiento_nombre UNIQUE (nombre)
);

CREATE TABLE ejercicios (
    id                   BIGSERIAL          PRIMARY KEY,
    uuid                 UUID               NOT NULL DEFAULT uuid_generate_v4(),
    nombre               VARCHAR(200)       NOT NULL,
    descripcion          TEXT,
    instrucciones        TEXT,
    categoria_id         SMALLINT           NOT NULL REFERENCES categorias_ejercicio (id) ON DELETE RESTRICT,
    nivel_dificultad     nivel_dificultad   NOT NULL,
    tipo_medida          tipo_medida        NOT NULL,
    imagen_url           VARCHAR(500),
    video_url            VARCHAR(500),
    calorias_por_minuto  NUMERIC(5,2)       CHECK (calorias_por_minuto >= 0),
    es_publico           BOOLEAN            NOT NULL DEFAULT TRUE,
    creado_por           BIGINT             REFERENCES usuarios (id) ON DELETE SET NULL,
    estado               estado_ejercicio   NOT NULL DEFAULT 'activo',
    created_at           TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT uq_ejercicios_uuid UNIQUE (uuid)
);
CREATE INDEX idx_ejercicios_uuid        ON ejercicios (uuid);
CREATE INDEX idx_ejercicios_categoria   ON ejercicios (categoria_id);
CREATE INDEX idx_ejercicios_nivel       ON ejercicios (nivel_dificultad);
CREATE INDEX idx_ejercicios_estado      ON ejercicios (estado);
CREATE INDEX idx_ejercicios_publico     ON ejercicios (es_publico);
CREATE INDEX idx_ejercicios_creado_por  ON ejercicios (creado_por);
CREATE INDEX idx_ejercicios_activos     ON ejercicios (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ejercicios_nombre_trgm ON ejercicios USING gin (nombre gin_trgm_ops);

CREATE TABLE ejercicio_grupo_muscular (
    ejercicio_id       BIGINT        NOT NULL REFERENCES ejercicios       (id) ON DELETE CASCADE,
    grupo_muscular_id  SMALLINT      NOT NULL REFERENCES grupos_musculares(id) ON DELETE CASCADE,
    tipo               musculo_tipo  NOT NULL DEFAULT 'primario',
    PRIMARY KEY (ejercicio_id, grupo_muscular_id)
);
CREATE INDEX idx_ej_grupo_muscular ON ejercicio_grupo_muscular (grupo_muscular_id);

CREATE TABLE ejercicio_equipamiento (
    ejercicio_id    BIGINT   NOT NULL REFERENCES ejercicios  (id) ON DELETE CASCADE,
    equipamiento_id SMALLINT NOT NULL REFERENCES equipamiento(id) ON DELETE CASCADE,
    es_opcional     BOOLEAN  NOT NULL DEFAULT FALSE,
    PRIMARY KEY (ejercicio_id, equipamiento_id)
);

-- ============================================================
--  6. RUTINAS  (depende de: usuarios, ejercicios)
-- ============================================================
CREATE TABLE rutinas (
    id                    BIGSERIAL         PRIMARY KEY,
    uuid                  UUID              NOT NULL DEFAULT uuid_generate_v4(),
    nombre                VARCHAR(200)      NOT NULL,
    descripcion           TEXT,
    creado_por            BIGINT            NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    nivel_dificultad      nivel_dificultad  NOT NULL,
    duracion_estimada_min SMALLINT          CHECK (duracion_estimada_min > 0),
    dias_por_semana       SMALLINT          CHECK (dias_por_semana BETWEEN 1 AND 7),
    objetivo              objetivo_rutina,
    es_publica            BOOLEAN           NOT NULL DEFAULT FALSE,
    estado                estado_rutina     NOT NULL DEFAULT 'borrador',
    imagen_url            VARCHAR(500),
    created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT uq_rutinas_uuid UNIQUE (uuid)
);
CREATE INDEX idx_rutinas_uuid        ON rutinas (uuid);
CREATE INDEX idx_rutinas_creado_por  ON rutinas (creado_por);
CREATE INDEX idx_rutinas_estado      ON rutinas (estado);
CREATE INDEX idx_rutinas_objetivo    ON rutinas (objetivo);
CREATE INDEX idx_rutinas_activas     ON rutinas (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rutinas_nombre_trgm ON rutinas USING gin (nombre gin_trgm_ops);

CREATE TABLE rutina_ejercicios (
    id                BIGSERIAL     PRIMARY KEY,
    rutina_id         BIGINT        NOT NULL REFERENCES rutinas   (id) ON DELETE CASCADE,
    ejercicio_id      BIGINT        NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
    dia_numero        SMALLINT      NOT NULL CHECK (dia_numero BETWEEN 1 AND 7),
    orden             SMALLINT      NOT NULL CHECK (orden > 0),
    series            SMALLINT      CHECK (series > 0),
    repeticiones      SMALLINT      CHECK (repeticiones > 0),
    tiempo_segundos   SMALLINT      CHECK (tiempo_segundos > 0),
    peso_kg           NUMERIC(6,2)  CHECK (peso_kg >= 0),
    descanso_segundos SMALLINT      CHECK (descanso_segundos >= 0),
    notas             TEXT,
    CONSTRAINT uq_rutina_dia_orden UNIQUE (rutina_id, dia_numero, orden)
);
CREATE INDEX idx_rutina_ej_rutina_id    ON rutina_ejercicios (rutina_id);
CREATE INDEX idx_rutina_ej_ejercicio_id ON rutina_ejercicios (ejercicio_id);
CREATE INDEX idx_rutina_ej_dia          ON rutina_ejercicios (rutina_id, dia_numero);

-- ============================================================
--  7. CIUDADES Y GIMNASIOS  (depende de: usuarios)
--     DEBE IR ANTES QUE SESIONES
-- ============================================================
CREATE TABLE ciudades (
    id                  SMALLSERIAL   PRIMARY KEY,
    nombre              VARCHAR(100)  NOT NULL,
    departamento_estado VARCHAR(100),
    pais                VARCHAR(100)  NOT NULL DEFAULT 'República Dominicana',
    codigo_postal       VARCHAR(20)
);
CREATE INDEX idx_ciudades_nombre ON ciudades (nombre);
CREATE INDEX idx_ciudades_pais   ON ciudades (pais);

CREATE TABLE gimnasios (
    id               BIGSERIAL        PRIMARY KEY,
    uuid             UUID             NOT NULL DEFAULT uuid_generate_v4(),
    nombre           VARCHAR(200)     NOT NULL,
    descripcion      TEXT,
    ciudad_id        SMALLINT         NOT NULL REFERENCES ciudades (id) ON DELETE RESTRICT,
    direccion        VARCHAR(300)     NOT NULL,
    latitud          NUMERIC(10,8)    CHECK (latitud  BETWEEN -90  AND 90),
    longitud         NUMERIC(11,8)    CHECK (longitud BETWEEN -180 AND 180),
    telefono         VARCHAR(20),
    email            VARCHAR(255),
    website          VARCHAR(500),
    logo_url         VARCHAR(500),
    horario_apertura TIME,
    horario_cierre   TIME,
    estado           estado_gimnasio  NOT NULL DEFAULT 'activo',
    registrado_por   BIGINT           NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT uq_gimnasios_uuid UNIQUE (uuid)
);
CREATE INDEX idx_gimnasios_uuid          ON gimnasios (uuid);
CREATE INDEX idx_gimnasios_ciudad_id     ON gimnasios (ciudad_id);
CREATE INDEX idx_gimnasios_estado        ON gimnasios (estado);
CREATE INDEX idx_gimnasios_registrado_por ON gimnasios (registrado_por);
CREATE INDEX idx_gimnasios_activos       ON gimnasios (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gimnasios_nombre_trgm   ON gimnasios USING gin (nombre gin_trgm_ops);

-- ============================================================
--  8. SESIONES  (depende de: usuarios, rutinas, gimnasios ✅)
-- ============================================================
CREATE TABLE sesiones (
    id                BIGSERIAL      PRIMARY KEY,
    uuid              UUID           NOT NULL DEFAULT uuid_generate_v4(),
    usuario_id        BIGINT         NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    rutina_id         BIGINT         NOT NULL REFERENCES rutinas  (id) ON DELETE RESTRICT,
    fecha_inicio      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    fecha_fin         TIMESTAMPTZ,
    duracion_minutos  SMALLINT       GENERATED ALWAYS AS (
                          CASE
                              WHEN fecha_fin IS NOT NULL
                              THEN EXTRACT(EPOCH FROM (fecha_fin - fecha_inicio))::INT / 60
                              ELSE NULL
                          END
                      ) STORED,
    calorias_quemadas SMALLINT       CHECK (calorias_quemadas >= 0),
    estado            estado_sesion  NOT NULL DEFAULT 'en_progreso',
    sensacion_general SMALLINT       CHECK (sensacion_general BETWEEN 1 AND 10),
    notas             TEXT,
    lugar_id          BIGINT         REFERENCES gimnasios (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sesiones_uuid       UNIQUE (uuid),
    CONSTRAINT ck_fecha_fin_posterior CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE INDEX idx_sesiones_uuid          ON sesiones (uuid);
CREATE INDEX idx_sesiones_usuario_id    ON sesiones (usuario_id);
CREATE INDEX idx_sesiones_rutina_id     ON sesiones (rutina_id);
CREATE INDEX idx_sesiones_fecha_inicio  ON sesiones (fecha_inicio DESC);
CREATE INDEX idx_sesiones_estado        ON sesiones (estado);
CREATE INDEX idx_sesiones_lugar_id      ON sesiones (lugar_id);
CREATE INDEX idx_sesiones_usuario_fecha ON sesiones (usuario_id, fecha_inicio DESC);

CREATE TABLE sesion_ejercicios (
    id                  BIGSERIAL  PRIMARY KEY,
    sesion_id           BIGINT     NOT NULL REFERENCES sesiones         (id) ON DELETE CASCADE,
    ejercicio_id        BIGINT     NOT NULL REFERENCES ejercicios        (id) ON DELETE RESTRICT,
    rutina_ejercicio_id BIGINT     REFERENCES rutina_ejercicios          (id) ON DELETE SET NULL,
    orden               SMALLINT   NOT NULL CHECK (orden > 0),
    series_completadas  SMALLINT   CHECK (series_completadas >= 0),
    completado          BOOLEAN    NOT NULL DEFAULT FALSE,
    notas               TEXT
);
CREATE INDEX idx_sesion_ej_sesion_id    ON sesion_ejercicios (sesion_id);
CREATE INDEX idx_sesion_ej_ejercicio_id ON sesion_ejercicios (ejercicio_id);
CREATE INDEX idx_sesion_ej_rutina_ej_id ON sesion_ejercicios (rutina_ejercicio_id);

CREATE TABLE sesion_series (
    id                      BIGSERIAL     PRIMARY KEY,
    sesion_ejercicio_id     BIGINT        NOT NULL REFERENCES sesion_ejercicios (id) ON DELETE CASCADE,
    numero_serie            SMALLINT      NOT NULL CHECK (numero_serie > 0),
    repeticiones_realizadas SMALLINT      CHECK (repeticiones_realizadas >= 0),
    peso_kg                 NUMERIC(6,2)  CHECK (peso_kg >= 0),
    tiempo_segundos         SMALLINT      CHECK (tiempo_segundos >= 0),
    distancia_metros        NUMERIC(8,2)  CHECK (distancia_metros >= 0),
    completada              BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sesion_serie UNIQUE (sesion_ejercicio_id, numero_serie)
);
CREATE INDEX idx_sesion_series_ej_id ON sesion_series (sesion_ejercicio_id);

-- ============================================================
--  9. ENTRENADORES  (depende de: usuarios, gimnasios ✅)
-- ============================================================
CREATE TABLE entrenadores (
    id               BIGSERIAL          PRIMARY KEY,
    usuario_id       BIGINT             NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    gimnasio_id      BIGINT             NOT NULL REFERENCES gimnasios(id) ON DELETE RESTRICT,
    especialidad     VARCHAR(200),
    certificaciones  JSONB,
    anos_experiencia SMALLINT           CHECK (anos_experiencia >= 0),
    biografia        TEXT,
    tarifa_hora      NUMERIC(10,2)      CHECK (tarifa_hora >= 0),
    disponible       BOOLEAN            NOT NULL DEFAULT TRUE,
    estado           estado_entrenador  NOT NULL DEFAULT 'activo',
    registrado_por   BIGINT             NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entrenador_gimnasio UNIQUE (usuario_id, gimnasio_id)
);
CREATE INDEX idx_entrenadores_usuario_id  ON entrenadores (usuario_id);
CREATE INDEX idx_entrenadores_gimnasio_id ON entrenadores (gimnasio_id);
CREATE INDEX idx_entrenadores_estado      ON entrenadores (estado);
CREATE INDEX idx_entrenadores_disponible  ON entrenadores (disponible);
CREATE INDEX idx_entrenadores_gin_certs   ON entrenadores USING gin (certificaciones);

CREATE TABLE usuario_entrenador (
    id             BIGSERIAL          PRIMARY KEY,
    usuario_id     BIGINT             NOT NULL REFERENCES usuarios    (id) ON DELETE CASCADE,
    entrenador_id  BIGINT             NOT NULL REFERENCES entrenadores(id) ON DELETE CASCADE,
    fecha_inicio   DATE               NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin      DATE,
    estado         estado_asignacion  NOT NULL DEFAULT 'pendiente',
    notas          TEXT,
    CONSTRAINT ck_fechas_entrenador CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE INDEX idx_usr_ent_usuario_id    ON usuario_entrenador (usuario_id);
CREATE INDEX idx_usr_ent_entrenador_id ON usuario_entrenador (entrenador_id);
CREATE INDEX idx_usr_ent_estado        ON usuario_entrenador (estado);

-- ============================================================
--  10. SISTEMA — NOTIFICACIONES, METAS, AUDITORÍA
-- ============================================================
CREATE TABLE notificaciones (
    id          BIGSERIAL          PRIMARY KEY,
    usuario_id  BIGINT             NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    tipo        notificacion_tipo  NOT NULL,
    titulo      VARCHAR(200)       NOT NULL,
    mensaje     TEXT               NOT NULL,
    leida       BOOLEAN            NOT NULL DEFAULT FALSE,
    url_accion  VARCHAR(500),
    created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_usuario_id  ON notificaciones (usuario_id);
CREATE INDEX idx_notif_leida       ON notificaciones (usuario_id, leida);
CREATE INDEX idx_notif_tipo        ON notificaciones (tipo);
CREATE INDEX idx_notif_created_at  ON notificaciones (created_at DESC);

CREATE TABLE metas (
    id              BIGSERIAL    PRIMARY KEY,
    usuario_id      BIGINT       NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    tipo            meta_tipo    NOT NULL,
    descripcion     VARCHAR(300),
    valor_objetivo  NUMERIC(10,2),
    valor_actual    NUMERIC(10,2) DEFAULT 0,
    unidad          VARCHAR(50),
    fecha_objetivo  DATE,
    estado          estado_meta  NOT NULL DEFAULT 'activa',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_metas_usuario_id ON metas (usuario_id);
CREATE INDEX idx_metas_estado     ON metas (estado);
CREATE INDEX idx_metas_tipo       ON metas (tipo);

CREATE TABLE auditoria_logs (
    id               BIGSERIAL       PRIMARY KEY,
    usuario_id       BIGINT          REFERENCES usuarios (id) ON DELETE SET NULL,
    accion           VARCHAR(100)    NOT NULL,
    tabla_afectada   VARCHAR(100),
    registro_id      BIGINT,
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    ip_origen        VARCHAR(45),
    user_agent       VARCHAR(500),
    resultado        resultado_tipo  NOT NULL DEFAULT 'exitoso',
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_usuario_id  ON auditoria_logs (usuario_id);
CREATE INDEX idx_audit_accion      ON auditoria_logs (accion);
CREATE INDEX idx_audit_tabla       ON auditoria_logs (tabla_afectada);
CREATE INDEX idx_audit_created_at  ON auditoria_logs (created_at DESC);
CREATE INDEX idx_audit_resultado   ON auditoria_logs (resultado);
CREATE INDEX idx_audit_gin_nuevo   ON auditoria_logs USING gin (datos_nuevos);

-- ============================================================
--  11. FUNCIÓN updated_at AUTOMÁTICO
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ejercicios_updated_at
    BEFORE UPDATE ON ejercicios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_rutinas_updated_at
    BEFORE UPDATE ON rutinas
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_gimnasios_updated_at
    BEFORE UPDATE ON gimnasios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_entrenadores_updated_at
    BEFORE UPDATE ON entrenadores
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_metas_updated_at
    BEFORE UPDATE ON metas
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
--  12. TRIGGER — IMC automático
-- ============================================================
CREATE OR REPLACE FUNCTION fn_actualizar_categoria_imc()
RETURNS TRIGGER AS $$
BEGIN
    NEW.categoria_imc := CASE
        WHEN NEW.imc < 18.5 THEN 'bajo_peso'::categoria_imc
        WHEN NEW.imc < 25.0 THEN 'normal'::categoria_imc
        WHEN NEW.imc < 30.0 THEN 'sobrepeso'::categoria_imc
        WHEN NEW.imc < 35.0 THEN 'obesidad_i'::categoria_imc
        WHEN NEW.imc < 40.0 THEN 'obesidad_ii'::categoria_imc
        ELSE                     'obesidad_iii'::categoria_imc
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categoria_imc
    BEFORE INSERT OR UPDATE ON metricas_fisicas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_categoria_imc();

-- ============================================================
--  13. TRIGGER — Bloqueo eliminación ejercicio en rutina activa
-- ============================================================
CREATE OR REPLACE FUNCTION fn_bloquear_delete_ejercicio()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM rutina_ejercicios re
        JOIN rutinas r ON r.id = re.rutina_id
        WHERE re.ejercicio_id = OLD.id
          AND r.estado IN ('activa','borrador')
          AND r.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'No se puede eliminar el ejercicio "%" porque está en una rutina activa.', OLD.nombre
            USING ERRCODE = '23000';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloquear_delete_ejercicio
    BEFORE DELETE ON ejercicios
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_delete_ejercicio();

-- ============================================================
--  14. TRIGGER — Bloqueo sesión sin rutina activa
-- ============================================================
CREATE OR REPLACE FUNCTION fn_validar_rutina_activa_sesion()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM rutinas
        WHERE id = NEW.rutina_id
          AND estado = 'activa'
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'No se puede crear la sesión: la rutina no existe o no está activa.'
            USING ERRCODE = '23000';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_rutina_sesion
    BEFORE INSERT ON sesiones
    FOR EACH ROW EXECUTE FUNCTION fn_validar_rutina_activa_sesion();

-- ============================================================
--  15. VISTAS
-- ============================================================
CREATE OR REPLACE VIEW v_usuarios_perfil AS
SELECT
    u.id, u.uuid,
    u.nombre || ' ' || u.apellido       AS nombre_completo,
    u.email, u.genero, u.estado,
    u.email_verificado, u.ultimo_login,
    r.nombre                             AS rol,
    r.nivel_acceso,
    DATE_PART('year', AGE(u.fecha_nacimiento))::INT AS edad,
    u.created_at
FROM  usuarios u
JOIN  roles    r ON r.id = u.rol_id
WHERE u.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_ultima_metrica AS
SELECT DISTINCT ON (usuario_id)
    usuario_id, fecha_medicion,
    peso_kg, altura_cm, imc, categoria_imc, porcentaje_grasa
FROM  metricas_fisicas
ORDER BY usuario_id, fecha_medicion DESC;

CREATE OR REPLACE VIEW v_rutinas_resumen AS
SELECT
    r.id, r.uuid, r.nombre, r.objetivo,
    r.nivel_dificultad, r.estado, r.dias_por_semana,
    r.duracion_estimada_min,
    u.nombre || ' ' || u.apellido AS creado_por,
    COUNT(re.id)                   AS total_ejercicios,
    r.created_at
FROM  rutinas r
JOIN  usuarios u ON u.id = r.creado_por
LEFT JOIN rutina_ejercicios re ON re.rutina_id = r.id
WHERE r.deleted_at IS NULL
GROUP BY r.id, u.nombre, u.apellido;

CREATE OR REPLACE VIEW v_sesiones_historial AS
SELECT
    s.id, s.uuid, s.usuario_id,
    u.nombre || ' ' || u.apellido AS usuario,
    r.nombre       AS rutina,
    s.fecha_inicio, s.fecha_fin, s.duracion_minutos,
    s.calorias_quemadas, s.estado, s.sensacion_general,
    g.nombre       AS gimnasio,
    c.nombre       AS ciudad
FROM  sesiones s
JOIN  usuarios u ON u.id = s.usuario_id
JOIN  rutinas  r ON r.id = s.rutina_id
LEFT JOIN gimnasios g ON g.id = s.lugar_id
LEFT JOIN ciudades  c ON c.id = g.ciudad_id;

CREATE OR REPLACE VIEW v_entrenadores_gimnasio AS
SELECT
    e.id,
    u.nombre || ' ' || u.apellido AS entrenador,
    u.email, e.especialidad, e.anos_experiencia,
    e.tarifa_hora, e.disponible, e.estado,
    g.nombre AS gimnasio,
    c.nombre AS ciudad, c.pais
FROM  entrenadores e
JOIN  usuarios  u ON u.id = e.usuario_id
JOIN  gimnasios g ON g.id = e.gimnasio_id
JOIN  ciudades  c ON c.id = g.ciudad_id
WHERE e.estado = 'activo' AND g.deleted_at IS NULL;

-- ============================================================
--  16. SEED — Datos iniciales
-- ============================================================
INSERT INTO roles (nombre, descripcion, nivel_acceso) VALUES
    ('usuario',    'Usuario regular de la aplicación',            1),
    ('entrenador', 'Entrenador certificado asignado a un gimnasio', 2),
    ('admin',      'Administrador con acceso total al sistema',    3);

INSERT INTO permisos (nombre, descripcion, modulo) VALUES
    ('usuarios.ver',          'Ver listado de usuarios',              'usuarios'),
    ('usuarios.editar',       'Editar cualquier perfil de usuario',   'usuarios'),
    ('usuarios.eliminar',     'Eliminar usuarios del sistema',        'usuarios'),
    ('gimnasios.crear',       'Crear nuevos gimnasios',               'gimnasios'),
    ('gimnasios.editar',      'Editar información de gimnasios',      'gimnasios'),
    ('gimnasios.eliminar',    'Eliminar gimnasios',                   'gimnasios'),
    ('entrenadores.crear',    'Registrar nuevos entrenadores',        'entrenadores'),
    ('entrenadores.editar',   'Editar información de entrenadores',   'entrenadores'),
    ('entrenadores.eliminar', 'Eliminar entrenadores',                'entrenadores'),
    ('ejercicios.crear',      'Crear ejercicios en la biblioteca',    'ejercicios'),
    ('ejercicios.editar',     'Editar ejercicios existentes',         'ejercicios'),
    ('ejercicios.eliminar',   'Eliminar ejercicios de la biblioteca', 'ejercicios'),
    ('rutinas.ver_todas',     'Ver rutinas de todos los usuarios',    'rutinas'),
    ('sesiones.ver_todas',    'Ver sesiones de todos los usuarios',   'sesiones'),
    ('auditoria.ver',         'Acceder a los logs de auditoría',      'auditoria');

-- Admin recibe todos los permisos
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT 3, id FROM permisos;

-- Entrenador recibe permisos limitados
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT 2, id FROM permisos
WHERE nombre IN ('ejercicios.crear','ejercicios.editar','rutinas.ver_todas');

INSERT INTO categorias_ejercicio (nombre, descripcion, color_hex) VALUES
    ('Fuerza',         'Levantamiento y resistencia muscular',      '#DC2626'),
    ('Cardio',         'Resistencia aeróbica y cardiovascular',     '#2563EB'),
    ('Flexibilidad',   'Estiramientos y movilidad articular',       '#059669'),
    ('Funcional',      'Movimientos naturales y multifuncionales',  '#D97706'),
    ('HIIT',           'Alta intensidad por intervalos',            '#7C3AED'),
    ('Calistenia',     'Ejercicios con el peso corporal',           '#0D9488'),
    ('Rehabilitación', 'Recuperación y fisioterapia',               '#6B7280');

INSERT INTO grupos_musculares (nombre, descripcion) VALUES
    ('Pecho',          'Músculo pectoral mayor y menor'),
    ('Espalda',        'Dorsales, trapecios y romboides'),
    ('Hombros',        'Deltoides anterior, medial y posterior'),
    ('Bíceps',         'Músculo bíceps braquial'),
    ('Tríceps',        'Músculo tríceps braquial'),
    ('Abdomen',        'Core: recto abdominal, oblicuos y transverso'),
    ('Cuádriceps',     'Parte frontal del muslo'),
    ('Isquiotibiales', 'Parte posterior del muslo'),
    ('Glúteos',        'Glúteo mayor, mediano y menor'),
    ('Pantorrillas',   'Gastrocnemio y sóleo'),
    ('Antebrazo',      'Flexores y extensores del antebrazo'),
    ('Lumbar',         'Erector espinal y músculos lumbares');

INSERT INTO equipamiento (nombre, descripcion) VALUES
    ('Sin equipo',        'Ejercicio de peso corporal'),
    ('Mancuernas',        'Par de mancuernas de peso libre'),
    ('Barra olímpica',    'Barra olímpica con discos'),
    ('Kettlebell',        'Pesa rusa de hierro fundido'),
    ('Máquina polea',     'Máquina de cable y polea ajustable'),
    ('Banco plano',       'Banco de ejercicios plano'),
    ('Banda elástica',    'Banda de resistencia elástica'),
    ('Cuerda de salto',   'Cuerda para salto cardiovascular'),
    ('TRX',               'Sistema de suspensión con correas'),
    ('Bola estabilidad',  'Balón suizo de estabilidad'),
    ('Barras paralelas',  'Barras de calistenia paralelas'),
    ('Bicicleta estática','Bicicleta para cardio indoor');

INSERT INTO ciudades (nombre, departamento_estado, pais) VALUES
    ('Santo Domingo',        'Distrito Nacional',     'República Dominicana'),
    ('Santiago',             'Santiago',              'República Dominicana'),
    ('La Romana',            'La Romana',             'República Dominicana'),
    ('San Pedro de Macorís', 'San Pedro de Macorís',  'República Dominicana'),
    ('Puerto Plata',         'Puerto Plata',          'República Dominicana'),
    ('Moca',                 'Espaillat',             'República Dominicana'),
    ('Higüey',               'La Altagracia',         'República Dominicana');