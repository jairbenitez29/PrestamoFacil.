import { supabase } from './supabaseClient'

export async function obtenerTodosLosClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      cobrador:perfiles!clientes_cobrador_id_fkey(id, nombre_completo),
      prestamos(id, estado, monto_prestado, fecha_vencimiento)
    `)
    .order('nombre_completo')
  if (error) throw error
  return data
}

export async function obtenerClientesPorCobrador(cobradorId) {
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      prestamos(
        id, monto_prestado, tasa_interes_mensual, fecha_inicio,
        fecha_vencimiento, meses_mora, estado,
        abonos(id, monto, fecha_pago)
      )
    `)
    .eq('cobrador_id', cobradorId)
    .eq('estado', 'activo')
    .order('nombre_completo')
  if (error) throw error
  return data
}

export async function obtenerClientePorId(clienteId) {
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      cobrador:perfiles!clientes_cobrador_id_fkey(id, nombre_completo),
      prestamos(
        *,
        abonos(*)
      )
    `)
    .eq('id', clienteId)
    .single()
  if (error) throw error
  return data
}

export async function crearCliente(clienteData) {
  const { data, error } = await supabase
    .from('clientes')
    .insert(clienteData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarCliente(clienteId, cambios) {
  const { data, error } = await supabase
    .from('clientes')
    .update(cambios)
    .eq('id', clienteId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function asignarCobradorACliente(clienteId, cobradorId) {
  const { data, error } = await supabase
    .from('clientes')
    .update({ cobrador_id: cobradorId })
    .eq('id', clienteId)
    .select()
    .single()
  if (error) throw error
  return data
}
