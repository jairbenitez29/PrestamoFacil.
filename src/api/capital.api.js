import { supabase } from './supabaseClient'

export async function obtenerMovimientosDeCapital() {
  const { data, error } = await supabase
    .from('capital_movimientos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function registrarMovimientoDeCapital({ tipo, monto, descripcion, created_by }) {
  const { data, error } = await supabase
    .from('capital_movimientos')
    .insert({ tipo, monto, descripcion, created_by })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function obtenerResumenCapital() {
  const { data: movimientos, error } = await supabase
    .from('capital_movimientos')
    .select('tipo, monto')
  if (error) throw error

  const { data: prestamos, error: errorPrestamos } = await supabase
    .from('prestamos')
    .select('monto_prestado, estado')
    .in('estado', ['activo', 'mora'])
  if (errorPrestamos) throw errorPrestamos

  const { data: abonos, error: errorAbonos } = await supabase
    .from('abonos')
    .select('monto')
  if (errorAbonos) throw errorAbonos

  const totalIngresado = movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.monto, 0)

  const totalEgresado = movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((sum, m) => sum + m.monto, 0)

  const capitalEnCalle = prestamos
    .reduce((sum, p) => sum + p.monto_prestado, 0)

  const totalRecaudado = abonos.reduce((sum, a) => sum + a.monto, 0)

  return {
    totalIngresado,
    totalEgresado,
    capitalEnCalle,
    totalRecaudado,
    capitalDisponible: totalIngresado - totalEgresado - capitalEnCalle + totalRecaudado,
  }
}
