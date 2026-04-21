import { supabase } from './supabaseClient'

export async function obtenerPerfilPorId(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function obtenerTodosLosCobradores() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('rol', 'cobrador')
    .order('nombre_completo')
  if (error) throw error
  return data
}

export async function crearCobrador({ nombre_completo, email, telefono, password }) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre_completo, rol: 'cobrador', telefono },
    },
  })
  if (authError) throw authError
  return authData
}

export async function actualizarEstadoCobrador(cobradorId, activo) {
  const { data, error } = await supabase
    .from('perfiles')
    .update({ activo })
    .eq('id', cobradorId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarPerfil(userId, cambios) {
  const { data, error } = await supabase
    .from('perfiles')
    .update(cambios)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
