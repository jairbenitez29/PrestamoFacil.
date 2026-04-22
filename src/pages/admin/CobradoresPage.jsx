import { useEffect, useState } from 'react'
import { Plus, UserCheck, Phone, Mail, ToggleLeft, ToggleRight, Users } from 'lucide-react'
import { obtenerTodosLosCobradores, crearCobrador, actualizarEstadoCobrador } from '../../api/perfiles.api'
import { obtenerTodosLosClientes } from '../../api/clientes.api'
import { obtenerAbonosDeCobrador_Hoy } from '../../api/abonos.api'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { formatearMoneda } from '../../utils/calculos'

const FORM_INICIAL = { nombre_completo: '', email: '', telefono: '', password: '' }

export function CobradoresPage() {
  const [cobradores, setCobradores] = useState([])
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalCrear, setModalCrear] = useState(false)
  const [formulario, setFormulario] = useState(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [verPassword, setVerPassword] = useState(false)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const [cb, cl] = await Promise.all([obtenerTodosLosCobradores(), obtenerTodosLosClientes()])
      setCobradores(cb)
      setClientes(cl)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleCrear(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await crearCobrador(formulario)
      await cargarDatos()
      setModalCrear(false)
      setFormulario(FORM_INICIAL)
    } catch (err) {
      setError(err.message || 'Error al crear cobrador')
    } finally {
      setGuardando(false)
    }
  }

  async function handleToggleActivo(cobrador) {
    try {
      await actualizarEstadoCobrador(cobrador.id, !cobrador.activo)
      setCobradores(prev => prev.map(c => c.id === cobrador.id ? { ...c, activo: !c.activo } : c))
    } catch (err) {
      console.error(err)
    }
  }

  if (cargando) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="section-title text-2xl">Cobradores</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {cobradores.filter(c => c.activo).length} activos · {cobradores.length} registrados
          </p>
        </div>
        <button onClick={() => { setFormulario(FORM_INICIAL); setError(''); setModalCrear(true) }} className="btn-primary">
          <Plus size={16} /> Nuevo cobrador
        </button>
      </div>

      {cobradores.length === 0 ? (
        <EmptyState icon={UserCheck} title="Sin cobradores registrados"
          description="Agrega cobradores para que puedan gestionar los cobros en campo."
          action={<button onClick={() => setModalCrear(true)} className="btn-primary"><Plus size={16} /> Nuevo cobrador</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cobradores.map((cobrador) => {
            const clientesAsignados = clientes.filter(c => c.cobrador_id === cobrador.id && c.estado === 'activo')
            return (
              <div key={cobrador.id} className={`card transition-all duration-200 ${!cobrador.activo ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      cobrador.activo
                        ? 'bg-gradient-to-br from-primary-600 to-primary-900'
                        : 'bg-slate-700'
                    }`}>
                      <span className="text-white font-bold text-xl">
                        {cobrador.nombre_completo.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{cobrador.nombre_completo}</h3>
                      <p className="text-slate-500 text-xs">Cobrador</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActivo(cobrador)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      cobrador.activo ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-600 hover:bg-white/10'
                    }`}
                    title={cobrador.activo ? 'Desactivar' : 'Activar'}
                  >
                    {cobrador.activo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  {cobrador.email && (
                    <div className="flex items-center gap-2.5 text-slate-400">
                      <Mail size={13} className="flex-shrink-0" />
                      <span className="truncate">{cobrador.email}</span>
                    </div>
                  )}
                  {cobrador.telefono && (
                    <div className="flex items-center gap-2.5 text-slate-400">
                      <Phone size={13} className="flex-shrink-0" />
                      <span>{cobrador.telefono}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Users size={13} className="flex-shrink-0" />
                    <span>{clientesAsignados.length} clientes asignados</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-between">
                  <span className={cobrador.activo ? 'badge-green' : 'badge-red'}>
                    {cobrador.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  {clientesAsignados.length > 0 && (
                    <div className="flex -space-x-2">
                      {clientesAsignados.slice(0, 3).map(c => (
                        <div key={c.id} className="w-7 h-7 rounded-full bg-primary-800 border-2 border-[#13151f] flex items-center justify-center">
                          <span className="text-white text-xs font-medium">{c.nombre_completo.charAt(0)}</span>
                        </div>
                      ))}
                      {clientesAsignados.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-[#13151f] flex items-center justify-center">
                          <span className="text-slate-400 text-xs">+{clientesAsignados.length - 3}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalCrear} onClose={() => setModalCrear(false)} title="Nuevo cobrador">
        <form onSubmit={handleCrear} className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">{error}</p>}
          <div>
            <label className="label-field">Nombre completo</label>
            <input className="input-field" required value={formulario.nombre_completo}
              onChange={e => setFormulario(f => ({ ...f, nombre_completo: e.target.value }))}
              placeholder="Carlos Gómez" />
          </div>
          <div>
            <label className="label-field">Correo electrónico</label>
            <input className="input-field" type="email" required value={formulario.email}
              onChange={e => setFormulario(f => ({ ...f, email: e.target.value }))}
              placeholder="cobrador@ejemplo.com" />
          </div>
          <div>
            <label className="label-field">Teléfono</label>
            <input className="input-field" inputMode="numeric" value={formulario.telefono}
              onChange={e => setFormulario(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '') }))}
              placeholder="3001234567" />
          </div>
          <div>
            <label className="label-field">Contraseña temporal</label>
            <div className="relative">
              <input
                className="input-field pr-20"
                type={verPassword ? 'text' : 'password'}
                required minLength={6}
                value={formulario.password}
                onChange={e => setFormulario(f => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setVerPassword(!verPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">
                {verPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          <p className="text-slate-500 text-xs">El cobrador podrá cambiar su contraseña después de ingresar.</p>
          <button type="submit" disabled={guardando} className="btn-primary w-full justify-center py-3">
            {guardando ? <Spinner size="sm" /> : null}
            {guardando ? 'Creando cuenta...' : 'Crear cobrador'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
