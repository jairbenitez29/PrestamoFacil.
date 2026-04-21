import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { obtenerPerfilPorId } from '../api/perfiles.api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) cargarPerfil(session.user.id)
      else setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) cargarPerfil(session.user.id)
      else { setPerfil(null); setCargando(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId) {
    try {
      const data = await obtenerPerfilPorId(userId)
      setPerfil(data)
    } catch (err) {
      console.error('Error cargando perfil:', err)
    } finally {
      setCargando(false)
    }
  }

  async function iniciarSesion(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setPerfil(null)
  }

  const esAdmin = perfil?.rol === 'admin'
  const esCobrador = perfil?.rol === 'cobrador'

  return (
    <AuthContext.Provider value={{ session, perfil, cargando, esAdmin, esCobrador, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
