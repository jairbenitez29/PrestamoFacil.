import { supabase } from './supabaseClient'

export async function obtenerAbonosPorPrestamo(prestamoId) {
  const { data, error } = await supabase
    .from('abonos')
    .select(`
      *,
      cobrador:perfiles!abonos_cobrador_id_fkey(id, nombre_completo)
    `)
    .eq('prestamo_id', prestamoId)
    .order('fecha_pago', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenerAbonosPorCobrador(cobradorId) {
  const { data, error } = await supabase
    .from('abonos')
    .select(`
      *,
      prestamo:prestamos(
        id, monto_prestado,
        cliente:clientes(id, nombre_completo)
      )
    `)
    .eq('cobrador_id', cobradorId)
    .order('fecha_pago', { ascending: false })
  if (error) throw error
  return data
}

export async function obtenerAbonosDeCobrador_Hoy(cobradorId) {
  const hoy = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('abonos')
    .select(`
      *,
      prestamo:prestamos(
        id, monto_prestado,
        cliente:clientes(id, nombre_completo, direccion)
      )
    `)
    .eq('cobrador_id', cobradorId)
    .eq('fecha_pago', hoy)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function registrarAbono({ prestamo_id, cobrador_id, monto, fecha_pago, observacion }) {
  const { data, error } = await supabase
    .from('abonos')
    .insert({ prestamo_id, cobrador_id, monto, fecha_pago, observacion })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarAbono(abonoId) {
  const { error } = await supabase
    .from('abonos')
    .delete()
    .eq('id', abonoId)
  if (error) throw error
}

export async function obtenerResumenAbonosPorFecha(desde, hasta) {
  const { data, error } = await supabase
    .from('abonos')
    .select(`
      monto, fecha_pago,
      cobrador:perfiles!abonos_cobrador_id_fkey(id, nombre_completo)
    `)
    .gte('fecha_pago', desde)
    .lte('fecha_pago', hasta)
    .order('fecha_pago', { ascending: false })
  if (error) throw error
  return data
}
