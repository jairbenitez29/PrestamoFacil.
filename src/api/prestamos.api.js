import { supabase } from './supabaseClient'

export async function obtenerTodosLosPrestamos() {
  const { data, error } = await supabase
    .from('prestamos')
    .select(`
      *,
      cliente:clientes(id, nombre_completo, cedula, telefono, direccion),
      cobrador:perfiles!prestamos_cobrador_id_fkey(id, nombre_completo),
      abonos(id, monto, fecha_pago, observacion)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenerPrestamosPorCobrador(cobradorId) {
  const { data, error } = await supabase
    .from('prestamos')
    .select(`
      *,
      cliente:clientes(id, nombre_completo, cedula, telefono, direccion, barrio),
      abonos(id, monto, fecha_pago, observacion)
    `)
    .eq('cobrador_id', cobradorId)
    .in('estado', ['activo', 'mora'])
    .order('fecha_vencimiento')
  if (error) throw error
  return data
}

export async function obtenerPrestamoPorId(prestamoId) {
  const { data, error } = await supabase
    .from('prestamos')
    .select(`
      *,
      cliente:clientes(id, nombre_completo, cedula, telefono, direccion, barrio),
      cobrador:perfiles!prestamos_cobrador_id_fkey(id, nombre_completo),
      abonos(id, monto, fecha_pago, observacion, cobrador_id)
    `)
    .eq('id', prestamoId)
    .single()
  if (error) throw error
  return data
}

export async function crearPrestamo(prestamoData) {
  const { data, error } = await supabase
    .from('prestamos')
    .insert(prestamoData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarEstadoPrestamo(prestamoId, estado, meses_mora = 0) {
  const { data, error } = await supabase
    .from('prestamos')
    .update({ estado, meses_mora })
    .eq('id', prestamoId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recalcularMoraPrestamos() {
  const hoy = new Date().toISOString().split('T')[0]
  const { data: prestamosActivos, error } = await supabase
    .from('prestamos')
    .select('id, fecha_vencimiento, meses_mora, estado')
    .in('estado', ['activo', 'mora'])
  if (error) throw error

  for (const prestamo of prestamosActivos) {
    if (prestamo.fecha_vencimiento < hoy) {
      const fechaVenc = new Date(prestamo.fecha_vencimiento)
      const ahora = new Date(hoy)
      const mesesMora = Math.ceil(
        (ahora - fechaVenc) / (1000 * 60 * 60 * 24 * 30)
      )
      await supabase
        .from('prestamos')
        .update({ estado: 'mora', meses_mora: mesesMora })
        .eq('id', prestamo.id)
    }
  }
}
