-- ============================================================
-- DATOS DE PRUEBA - PRESTAMOS FÁCIL
-- IMPORTANTE: Ejecutar DESPUÉS del schema.sql
-- IMPORTANTE: Primero crea los usuarios en Authentication > Users
--             en el dashboard de Supabase con los emails abajo,
--             luego ejecuta este seed que asigna roles.
-- ============================================================

-- Actualizar el perfil del admin (reemplaza el UUID con el real de tu usuario admin)
-- Crea primero el usuario admin en Supabase Auth con email: admin@prestamosfacil.co
-- y contraseña: Admin2024!
-- Luego ejecuta:
UPDATE public.perfiles
SET rol = 'admin', nombre_completo = 'Victor Palencia', telefono = '3001112233'
WHERE email = 'admin@prestamosfacil.co';

-- Actualizar cobrador 1 (crea usuario: cobrador1@prestamosfacil.co / Cobrador2024!)
UPDATE public.perfiles
SET rol = 'cobrador', nombre_completo = 'Carlos Gómez', telefono = '3154445566'
WHERE email = 'cobrador1@prestamosfacil.co';

-- Actualizar cobrador 2 (crea usuario: cobrador2@prestamosfacil.co / Cobrador2024!)
UPDATE public.perfiles
SET rol = 'cobrador', nombre_completo = 'María Torres', telefono = '3167778899'
WHERE email = 'cobrador2@prestamosfacil.co';

-- ============================================================
-- CLIENTES DE PRUEBA
-- ============================================================
DO $$
DECLARE
  v_admin_id    UUID;
  v_cobrador1   UUID;
  v_cobrador2   UUID;
  v_cliente1    UUID;
  v_cliente2    UUID;
  v_cliente3    UUID;
  v_cliente4    UUID;
  v_cliente5    UUID;
  v_cliente6    UUID;
  v_prestamo1   UUID;
  v_prestamo2   UUID;
  v_prestamo3   UUID;
  v_prestamo4   UUID;
  v_prestamo5   UUID;
BEGIN
  -- Obtener IDs de usuarios
  SELECT id INTO v_admin_id    FROM public.perfiles WHERE email = 'admin@prestamosfacil.co';
  SELECT id INTO v_cobrador1   FROM public.perfiles WHERE email = 'cobrador1@prestamosfacil.co';
  SELECT id INTO v_cobrador2   FROM public.perfiles WHERE email = 'cobrador2@prestamosfacil.co';

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin no encontrado. Crea primero el usuario admin@prestamosfacil.co en Supabase Auth.';
  END IF;

  -- Insertar clientes
  INSERT INTO public.clientes (id, nombre_completo, cedula, telefono, direccion, barrio, estado, cobrador_id, created_by)
  VALUES
    (gen_random_uuid(), 'Juan Carlos Pérez',   '10012345', '3101112222', 'Cra 5 # 10-20',   'El Centro',   'activo', v_cobrador1, v_admin_id),
    (gen_random_uuid(), 'María Fernanda López', '10023456', '3112223333', 'Cl 8 # 3-15',     'San José',    'activo', v_cobrador1, v_admin_id),
    (gen_random_uuid(), 'Pedro Antonio Ruiz',   '10034567', '3123334444', 'Cra 12 # 22-40',  'La Esperanza','activo', v_cobrador1, v_admin_id),
    (gen_random_uuid(), 'Ana Lucía Martínez',   '10045678', '3134445555', 'Cl 15 # 8-30',    'El Bosque',   'activo', v_cobrador2, v_admin_id),
    (gen_random_uuid(), 'Luis Eduardo García',  '10056789', '3145556666', 'Cra 20 # 5-12',   'El Prado',    'activo', v_cobrador2, v_admin_id),
    (gen_random_uuid(), 'Carmen Rosa Díaz',     '10067890', '3156667777', 'Cl 3 # 15-25',    'El Centro',   'activo', v_cobrador2, v_admin_id);

  -- Recuperar IDs de clientes por cédula
  SELECT id INTO v_cliente1 FROM public.clientes WHERE cedula = '10012345';
  SELECT id INTO v_cliente2 FROM public.clientes WHERE cedula = '10023456';
  SELECT id INTO v_cliente3 FROM public.clientes WHERE cedula = '10034567';
  SELECT id INTO v_cliente4 FROM public.clientes WHERE cedula = '10045678';
  SELECT id INTO v_cliente5 FROM public.clientes WHERE cedula = '10056789';
  SELECT id INTO v_cliente6 FROM public.clientes WHERE cedula = '10067890';

  -- Insertar préstamos
  INSERT INTO public.prestamos (id, cliente_id, cobrador_id, monto_prestado, tasa_interes_mensual, fecha_inicio, fecha_vencimiento, meses_mora, estado, created_by)
  VALUES
    (gen_random_uuid(), v_cliente1, v_cobrador1, 500000,  20, CURRENT_DATE - 15, CURRENT_DATE + 15, 0, 'activo',    v_admin_id),
    (gen_random_uuid(), v_cliente2, v_cobrador1, 300000,  20, CURRENT_DATE - 40, CURRENT_DATE - 10, 1, 'mora',      v_admin_id),
    (gen_random_uuid(), v_cliente3, v_cobrador1, 1000000, 20, CURRENT_DATE - 20, CURRENT_DATE + 10, 0, 'activo',    v_admin_id),
    (gen_random_uuid(), v_cliente4, v_cobrador2, 750000,  20, CURRENT_DATE - 35, CURRENT_DATE - 5,  1, 'mora',      v_admin_id),
    (gen_random_uuid(), v_cliente5, v_cobrador2, 200000,  20, CURRENT_DATE - 60, CURRENT_DATE - 30, 2, 'completado',v_admin_id),
    (gen_random_uuid(), v_cliente6, v_cobrador2, 600000,  20, CURRENT_DATE - 5,  CURRENT_DATE + 25, 0, 'activo',    v_admin_id);

  -- Recuperar IDs de préstamos
  SELECT id INTO v_prestamo1 FROM public.prestamos WHERE cliente_id = v_cliente1 AND estado = 'activo';
  SELECT id INTO v_prestamo2 FROM public.prestamos WHERE cliente_id = v_cliente2 AND estado = 'mora';
  SELECT id INTO v_prestamo3 FROM public.prestamos WHERE cliente_id = v_cliente3 AND estado = 'activo';
  SELECT id INTO v_prestamo4 FROM public.prestamos WHERE cliente_id = v_cliente4 AND estado = 'mora';
  SELECT id INTO v_prestamo5 FROM public.prestamos WHERE cliente_id = v_cliente5 AND estado = 'completado';

  -- Insertar abonos
  INSERT INTO public.abonos (prestamo_id, cobrador_id, monto, fecha_pago, observacion)
  VALUES
    (v_prestamo1, v_cobrador1, 100000, CURRENT_DATE - 10, 'Abono parcial semana 1'),
    (v_prestamo1, v_cobrador1, 50000,  CURRENT_DATE - 3,  'Abono parcial semana 2'),
    (v_prestamo2, v_cobrador1, 80000,  CURRENT_DATE - 30, 'Pago inicial'),
    (v_prestamo3, v_cobrador1, 200000, CURRENT_DATE - 15, 'Abono grande'),
    (v_prestamo3, v_cobrador1, 100000, CURRENT_DATE - 7,  'Abono semanal'),
    (v_prestamo4, v_cobrador2, 150000, CURRENT_DATE - 20, 'Abono parcial'),
    (v_prestamo5, v_cobrador2, 50000,  CURRENT_DATE - 55, 'Primer abono'),
    (v_prestamo5, v_cobrador2, 50000,  CURRENT_DATE - 45, 'Segundo abono'),
    (v_prestamo5, v_cobrador2, 50000,  CURRENT_DATE - 35, 'Tercer abono'),
    (v_prestamo5, v_cobrador2, 90000,  CURRENT_DATE - 25, 'Pago final + interés');

  -- Capital inicial del negocio
  INSERT INTO public.capital_movimientos (tipo, monto, descripcion, created_by)
  VALUES
    ('ingreso', 5000000,  'Capital inicial del negocio',           v_admin_id),
    ('ingreso', 2000000,  'Reinversión de ganancias mes 1',        v_admin_id),
    ('egreso',  500000,   CONCAT('Préstamo a Juan Carlos Pérez'),  v_admin_id),
    ('egreso',  300000,   CONCAT('Préstamo a María Fernanda López'),v_admin_id),
    ('egreso',  1000000,  CONCAT('Préstamo a Pedro Antonio Ruiz'), v_admin_id),
    ('egreso',  750000,   CONCAT('Préstamo a Ana Lucía Martínez'), v_admin_id),
    ('egreso',  200000,   CONCAT('Préstamo a Luis Eduardo García'),v_admin_id),
    ('egreso',  600000,   CONCAT('Préstamo a Carmen Rosa Díaz'),   v_admin_id),
    ('ingreso', 100000,   'Abono Juan Carlos - semana 1',          v_admin_id),
    ('ingreso', 50000,    'Abono Juan Carlos - semana 2',          v_admin_id),
    ('ingreso', 80000,    'Abono María Fernanda',                  v_admin_id),
    ('ingreso', 300000,   'Abonos Pedro Antonio',                  v_admin_id),
    ('ingreso', 150000,   'Abono Ana Lucía',                       v_admin_id),
    ('ingreso', 240000,   'Pago completo Luis Eduardo + interés',  v_admin_id);

  RAISE NOTICE 'Datos de prueba insertados exitosamente.';
END $$;
