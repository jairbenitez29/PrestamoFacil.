-- ============================================================
-- PRESTAMOS FÁCIL - ESQUEMA COMPLETO DE BASE DE DATOS
-- Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. TABLA DE PERFILES (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo  TEXT NOT NULL,
  email       TEXT NOT NULL,
  telefono    TEXT,
  rol         TEXT NOT NULL CHECK (rol IN ('admin', 'cobrador')) DEFAULT 'cobrador',
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  cedula          TEXT UNIQUE,
  telefono        TEXT,
  direccion       TEXT,
  barrio          TEXT,
  estado          TEXT NOT NULL CHECK (estado IN ('activo', 'inactivo')) DEFAULT 'activo',
  cobrador_id     UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES public.perfiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA DE PRÉSTAMOS
CREATE TABLE IF NOT EXISTS public.prestamos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id            UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cobrador_id           UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  monto_prestado        NUMERIC(12,2) NOT NULL CHECK (monto_prestado > 0),
  tasa_interes_mensual  NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (tasa_interes_mensual > 0),
  fecha_inicio          DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento     DATE NOT NULL,
  meses_mora            INTEGER NOT NULL DEFAULT 0,
  estado                TEXT NOT NULL CHECK (estado IN ('activo', 'completado', 'mora')) DEFAULT 'activo',
  created_by            UUID REFERENCES public.perfiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fecha_vencimiento_posterior CHECK (fecha_vencimiento > fecha_inicio)
);

-- 4. TABLA DE ABONOS
CREATE TABLE IF NOT EXISTS public.abonos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES public.prestamos(id) ON DELETE CASCADE,
  cobrador_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha_pago  DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA DE MOVIMIENTOS DE CAPITAL
CREATE TABLE IF NOT EXISTS public.capital_movimientos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto       NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL,
  created_by  UUID REFERENCES public.perfiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: Crear perfil automáticamente al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, email, rol, telefono)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cobrador'),
    NEW.raw_user_meta_data->>'telefono'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.perfiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_movimientos ENABLE ROW LEVEL SECURITY;

-- Helper function para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.obtener_rol_usuario()
RETURNS TEXT AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PERFILES: Cada usuario ve su propio perfil; admin ve todos
CREATE POLICY "perfiles_ver_propio" ON public.perfiles
  FOR SELECT USING (id = auth.uid() OR public.obtener_rol_usuario() = 'admin');

CREATE POLICY "perfiles_admin_insertar" ON public.perfiles
  FOR INSERT WITH CHECK (public.obtener_rol_usuario() = 'admin' OR id = auth.uid());

CREATE POLICY "perfiles_admin_actualizar" ON public.perfiles
  FOR UPDATE USING (public.obtener_rol_usuario() = 'admin' OR id = auth.uid());

-- CLIENTES: Admin ve todos; cobrador ve solo sus clientes asignados
CREATE POLICY "clientes_admin_total" ON public.clientes
  FOR ALL USING (public.obtener_rol_usuario() = 'admin');

CREATE POLICY "clientes_cobrador_ver" ON public.clientes
  FOR SELECT USING (
    public.obtener_rol_usuario() = 'cobrador'
    AND cobrador_id = auth.uid()
  );

-- PRÉSTAMOS: Admin ve todos; cobrador ve solo sus préstamos
CREATE POLICY "prestamos_admin_total" ON public.prestamos
  FOR ALL USING (public.obtener_rol_usuario() = 'admin');

CREATE POLICY "prestamos_cobrador_ver" ON public.prestamos
  FOR SELECT USING (
    public.obtener_rol_usuario() = 'cobrador'
    AND cobrador_id = auth.uid()
  );

CREATE POLICY "prestamos_cobrador_actualizar" ON public.prestamos
  FOR UPDATE USING (
    public.obtener_rol_usuario() = 'cobrador'
    AND cobrador_id = auth.uid()
  );

-- ABONOS: Admin ve todos; cobrador gestiona sus propios abonos
CREATE POLICY "abonos_admin_total" ON public.abonos
  FOR ALL USING (public.obtener_rol_usuario() = 'admin');

CREATE POLICY "abonos_cobrador_ver" ON public.abonos
  FOR SELECT USING (
    public.obtener_rol_usuario() = 'cobrador'
    AND cobrador_id = auth.uid()
  );

CREATE POLICY "abonos_cobrador_insertar" ON public.abonos
  FOR INSERT WITH CHECK (
    public.obtener_rol_usuario() = 'cobrador'
    AND cobrador_id = auth.uid()
  );

-- CAPITAL: Solo admin
CREATE POLICY "capital_solo_admin" ON public.capital_movimientos
  FOR ALL USING (public.obtener_rol_usuario() = 'admin');

-- ============================================================
-- ÍNDICES para mejorar rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_cobrador    ON public.clientes(cobrador_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_cliente    ON public.prestamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_cobrador   ON public.prestamos(cobrador_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado     ON public.prestamos(estado);
CREATE INDEX IF NOT EXISTS idx_abonos_prestamo      ON public.abonos(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_abonos_cobrador      ON public.abonos(cobrador_id);
CREATE INDEX IF NOT EXISTS idx_abonos_fecha         ON public.abonos(fecha_pago);
