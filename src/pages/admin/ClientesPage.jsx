import { useEffect, useState } from 'react'
import { Plus, Search, User, Phone, MapPin, UserCheck, Edit3, Eye } from 'lucide-react'
import { obtenerTodosLosClientes, crearCliente, actualizarCliente, asignarCobradorACliente } from '../../api/clientes.api'
import { obtenerTodosLosCobradores } from '../../api/perfiles.api'
import { useAuth } from '../../contexts/AuthContext'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { formatearFecha, calcularSaldoPrestamo } from '../../utils/calculos'

const ESTADO_INICIAL = {
  nombre_completo: '', cedula: '', telefono: '', direccion: '', barrio: '', cobrador_id: ''
}

export function ClientesPage() {
  const { perfil } = useAuth()
  const [clientes, setClientes] = useState([])
  const [cobradores, setCobradores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [modalVer, setModalVer] = useState(null)
  const [formulario, setFormulario] = useState(ESTADO_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [c, cb] = await Promise.all([obtenerTodosLosClientes(), obtenerTodosLosCobradores()])
      setClientes(c)
      setCobradores(cb)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const clientesFiltrados = clientes.filter(c => {
    const matchBusqueda = c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cedula?.includes(busqueda) || c.telefono?.includes(busqueda)
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  async function handleCrear(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await crearCliente({ ...formulario, estado: 'activo', created_by: perfil.id })
      await cargarDatos()
      setModalCrear(false)
      setFormulario(ESTADO_INICIAL)
    } catch (err) {
      setError(err.message || 'Error al crear el cliente')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEditar(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await actualizarCliente(modalEditar.id, formulario)
      await cargarDatos()
      setModalEditar(null)
    } catch (err) {
      setError(err.message || 'Error al actualizar el cliente')
    } finally {
      setGuardando(false)
    }
  }

  function abrirEditar(cliente) {
    setFormulario({
      nombre_completo: cliente.nombre_completo,
      cedula: cliente.cedula || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      barrio: cliente.barrio || '',
      cobrador_id: cliente.cobrador_id || '',
    })
    setError('')
    setModalEditar(cliente)
  }

  function abrirCrear() {
    setFormulario(ESTADO_INICIAL)
    setError('')
    setModalCrear(true)
  }

  const FormularioCliente = ({ onSubmit }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label-field">Nombre completo *</label>
          <input className="input-field" required value={formulario.nombre_completo}
            onChange={e => setFormulario(f => ({ ...f, nombre_completo: e.target.value }))}
            placeholder="Juan García López" />
        </div>
        <div>
          <label className="label-field">Cédula *</label>
          <input className="input-field" required value={formulario.cedula}
            onChange={e => setFormulario(f => ({ ...f, cedula: e.target.value }))}
            placeholder="12345678" />
        </div>
        <div>
          <label className="label-field">Teléfono</label>
          <input className="input-field" value={formulario.telefono}
            onChange={e => setFormulario(f => ({ ...f, telefono: e.target.value }))}
            placeholder="3001234567" />
        </div>
        <div className="col-span-2">
          <label className="label-field">Dirección</label>
          <input className="input-field" value={formulario.direccion}
            onChange={e => setFormulario(f => ({ ...f, direccion: e.target.value }))}
            placeholder="Cra 12 # 34-56" />
        </div>
        <div>
          <label className="label-field">Barrio</label>
          <input className="input-field" value={formulario.barrio}
            onChange={e => setFormulario(f => ({ ...f, barrio: e.target.value }))}
            placeholder="Centro" />
        </div>
        <div>
          <label className="label-field">Cobrador asignado</label>
          <select className="select-field" value={formulario.cobrador_id}
            onChange={e => setFormulario(f => ({ ...f, cobrador_id: e.target.value }))}>
            <option value="">Sin asignar</option>
            {cobradores.filter(c => c.activo).map(c => (
              <option key={c.id} value={c.id}>{c.nombre_completo}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">
          {guardando ? <Spinner size="sm" /> : null}
          {guardando ? 'Guardando...' : 'Guardar cliente'}
        </button>
      </div>
    </form>
  )

  if (cargando) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="section-title text-2xl">Clientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clientes.length} clientes registrados</p>
        </div>
        <button onClick={abrirCrear} className="btn-primary">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-10"
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select className="select-field sm:w-40" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* Lista */}
      {clientesFiltrados.length === 0 ? (
        <EmptyState
          icon={User}
          title="No se encontraron clientes"
          description="Agrega tu primer cliente o ajusta los filtros de búsqueda."
          action={<button onClick={abrirCrear} className="btn-primary"><Plus size={16} /> Nuevo cliente</button>}
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="table-header text-left px-5 py-3.5">Cliente</th>
                  <th className="table-header text-left px-4 py-3.5 hidden md:table-cell">Contacto</th>
                  <th className="table-header text-left px-4 py-3.5 hidden lg:table-cell">Cobrador</th>
                  <th className="table-header text-center px-4 py-3.5">Estado</th>
                  <th className="table-header text-center px-4 py-3.5">Préstamos</th>
                  <th className="table-header text-right px-5 py-3.5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => {
                  const prestamosActivos = (cliente.prestamos || []).filter(p => p.estado !== 'completado')
                  return (
                    <tr key={cliente.id} className="table-row">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm">
                              {cliente.nombre_completo.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white leading-none">{cliente.nombre_completo}</p>
                            <p className="text-slate-500 text-xs mt-0.5">CC: {cliente.cedula || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {cliente.telefono && (
                            <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                              <Phone size={11} /> {cliente.telefono}
                            </span>
                          )}
                          {cliente.barrio && (
                            <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                              <MapPin size={11} /> {cliente.barrio}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {cliente.cobrador ? (
                          <div className="flex items-center gap-2">
                            <UserCheck size={14} className="text-primary-400" />
                            <span className="text-slate-300 text-xs">{cliente.cobrador.nombre_completo}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {cliente.estado === 'activo'
                          ? <span className="badge-green">Activo</span>
                          : <span className="badge-red">Inactivo</span>
                        }
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-white font-semibold text-sm">{prestamosActivos.length}</span>
                          <span className="text-slate-500 text-xs">activos</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalVer(cliente)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => abrirEditar(cliente)}
                            className="p-2 hover:bg-primary-500/20 rounded-lg text-slate-500 hover:text-primary-400 transition-colors"
                            title="Editar"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear */}
      <Modal open={modalCrear} onClose={() => setModalCrear(false)} title="Nuevo cliente">
        <FormularioCliente onSubmit={handleCrear} />
      </Modal>

      {/* Modal Editar */}
      <Modal open={!!modalEditar} onClose={() => setModalEditar(null)} title="Editar cliente">
        <FormularioCliente onSubmit={handleEditar} />
      </Modal>

      {/* Modal Ver detalle */}
      {modalVer && (
        <Modal open={!!modalVer} onClose={() => setModalVer(null)} title="Detalle del cliente">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white/3 rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">{modalVer.nombre_completo.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{modalVer.nombre_completo}</h3>
                <p className="text-slate-500 text-sm">CC: {modalVer.cedula || '—'}</p>
                {modalVer.estado === 'activo'
                  ? <span className="badge-green mt-1">Activo</span>
                  : <span className="badge-red mt-1">Inactivo</span>
                }
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Teléfono', val: modalVer.telefono },
                { label: 'Barrio', val: modalVer.barrio },
                { label: 'Dirección', val: modalVer.direccion },
                { label: 'Cobrador', val: modalVer.cobrador?.nombre_completo || 'Sin asignar' },
                { label: 'Registrado', val: formatearFecha(modalVer.created_at?.split('T')[0]) },
                { label: 'Préstamos activos', val: (modalVer.prestamos || []).filter(p => p.estado !== 'completado').length },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white/3 rounded-xl p-3">
                  <p className="text-slate-500 text-xs mb-1">{label}</p>
                  <p className="text-white font-medium text-sm">{val || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
