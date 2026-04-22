import { useEffect, useState } from 'react'
import { Plus, Search, CreditCard, AlertTriangle, CheckCircle, Clock, Eye, Edit3 } from 'lucide-react'
import { obtenerTodosLosPrestamos, crearPrestamo, actualizarEstadoPrestamo } from '../../api/prestamos.api'
import { obtenerTodosLosClientes } from '../../api/clientes.api'
import { obtenerTodosLosCobradores } from '../../api/perfiles.api'
import { registrarMovimientoDeCapital } from '../../api/capital.api'
import { registrarAbono, obtenerAbonosPorPrestamo } from '../../api/abonos.api'
import { useAuth } from '../../contexts/AuthContext'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { formatearMoneda, formatearFecha, calcularSaldoPrestamo, diasParaVencer } from '../../utils/calculos'

const ESTADO_INICIAL_FORM = {
  cliente_id: '', cobrador_id: '', monto_prestado: '', tasa_interes_mensual: '20',
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_vencimiento: '',
}

export function PrestamosPage() {
  const { perfil } = useAuth()
  const [prestamos, setPrestamos] = useState([])
  const [clientes, setClientes] = useState([])
  const [cobradores, setCobradores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modalCrear, setModalCrear] = useState(false)
  const [modalVer, setModalVer] = useState(null)
  const [modalAbono, setModalAbono] = useState(null)
  const [formulario, setFormulario] = useState(ESTADO_INICIAL_FORM)
  const [montoAbono, setMontoAbono] = useState('')
  const [obsAbono, setObsAbono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const [p, c, cb] = await Promise.all([
        obtenerTodosLosPrestamos(),
        obtenerTodosLosClientes(),
        obtenerTodosLosCobradores(),
      ])
      setPrestamos(p)
      setClientes(c)
      setCobradores(cb)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const prestamosConCalculo = prestamos.map(p => ({
    ...p,
    calculo: calcularSaldoPrestamo(p, p.abonos || []),
  }))

  const prestamosFiltrados = prestamosConCalculo.filter(p => {
    const nombre = p.cliente?.nombre_completo?.toLowerCase() || ''
    const matchBusqueda = nombre.includes(busqueda.toLowerCase())
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  async function handleCrearPrestamo(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const monto = parseFloat(formulario.monto_prestado)
      await crearPrestamo({
        ...formulario,
        monto_prestado: monto,
        tasa_interes_mensual: parseFloat(formulario.tasa_interes_mensual),
        meses_mora: 0,
        estado: 'activo',
        created_by: perfil.id,
      })
      await registrarMovimientoDeCapital({
        tipo: 'egreso',
        monto,
        descripcion: `Préstamo otorgado a cliente`,
        created_by: perfil.id,
      })
      await cargarDatos()
      setModalCrear(false)
      setFormulario(ESTADO_INICIAL_FORM)
    } catch (err) {
      setError(err.message || 'Error al crear el préstamo')
    } finally {
      setGuardando(false)
    }
  }

  async function handleRegistrarAbono(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const monto = parseFloat(montoAbono)
      await registrarAbono({
        prestamo_id: modalAbono.id,
        cobrador_id: perfil.id,
        monto,
        fecha_pago: new Date().toISOString().split('T')[0],
        observacion: obsAbono || null,
      })
      await registrarMovimientoDeCapital({
        tipo: 'ingreso',
        monto,
        descripcion: `Abono recibido de ${modalAbono.cliente?.nombre_completo}`,
        created_by: perfil.id,
      })

      const calculo = calcularSaldoPrestamo(modalAbono, modalAbono.abonos || [])
      const nuevoSaldo = calculo.saldo - monto
      if (nuevoSaldo <= 0) {
        await actualizarEstadoPrestamo(modalAbono.id, 'completado')
      }
      await cargarDatos()
      setModalAbono(null)
      setMontoAbono('')
      setObsAbono('')
    } catch (err) {
      setError(err.message || 'Error al registrar abono')
    } finally {
      setGuardando(false)
    }
  }

  function badgeEstado(estado) {
    if (estado === 'activo') return <span className="badge-green">Activo</span>
    if (estado === 'mora') return <span className="badge-red">En mora</span>
    if (estado === 'completado') return <span className="badge-blue">Pagado</span>
    return null
  }

  if (cargando) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  const contadores = {
    activos: prestamos.filter(p => p.estado === 'activo').length,
    mora: prestamos.filter(p => p.estado === 'mora').length,
    completados: prestamos.filter(p => p.estado === 'completado').length,
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="section-title text-2xl">Préstamos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{prestamos.length} préstamos totales</p>
        </div>
        <button onClick={() => { setFormulario(ESTADO_INICIAL_FORM); setError(''); setModalCrear(true) }} className="btn-primary">
          <Plus size={16} /> Nuevo préstamo
        </button>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Activos', val: contadores.activos, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Clock },
          { label: 'En mora', val: contadores.mora, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle },
          { label: 'Pagados', val: contadores.completados, color: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20', icon: CheckCircle },
        ].map(({ label, val, color, bg, icon: Icon }) => (
          <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border ${bg}`}>
            <Icon size={16} className={color} />
            <div>
              <p className={`text-lg font-bold ${color}`}>{val}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-10" placeholder="Buscar por nombre del cliente..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <select className="select-field sm:w-44" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="mora">En mora</option>
          <option value="completado">Pagados</option>
        </select>
      </div>

      {/* Lista */}
      {prestamosFiltrados.length === 0 ? (
        <EmptyState icon={CreditCard} title="No se encontraron préstamos"
          description="Crea el primer préstamo para comenzar a gestionar."
          action={<button onClick={() => setModalCrear(true)} className="btn-primary"><Plus size={16} /> Nuevo préstamo</button>} />
      ) : (
        <div className="space-y-3">
          {prestamosFiltrados.map((prestamo) => {
            const dias = diasParaVencer(prestamo.fecha_vencimiento)
            const { calculo } = prestamo
            return (
              <div key={prestamo.id} className="card hover:border-white/20 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-900 font-bold text-sm">
                          {prestamo.cliente?.nombre_completo?.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{prestamo.cliente?.nombre_completo}</p>
                        <p className="text-slate-500 text-xs">
                          {prestamo.cobrador?.nombre_completo || 'Sin cobrador'} · Vence {formatearFecha(prestamo.fecha_vencimiento)}
                        </p>
                      </div>
                      <div className="ml-auto">{badgeEstado(prestamo.estado)}</div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Progreso de pago</span>
                        <span>{calculo.porcentajePagado.toFixed(0)}%</span>
                      </div>
                      <ProgressBar
                        porcentaje={calculo.porcentajePagado}
                        colorClass={prestamo.estado === 'mora' ? 'bg-red-500' : prestamo.estado === 'completado' ? 'bg-primary-500' : 'bg-emerald-500'}
                      />
                    </div>
                  </div>

                  {/* Montos */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">{formatearMoneda(calculo.saldo)}</p>
                      <p className="text-slate-500 text-xs">Saldo pendiente</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-slate-400 text-sm">{formatearMoneda(calculo.montoOriginal)}</p>
                      <p className="text-slate-600 text-xs">Prestado</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => setModalVer(prestamo)}
                      className="btn-secondary text-xs py-2"
                    >
                      <Eye size={13} /> Ver
                    </button>
                    {prestamo.estado !== 'completado' && (
                      <button
                        onClick={() => { setModalAbono(prestamo); setMontoAbono(''); setObsAbono(''); setError('') }}
                        className="btn-gold text-xs py-2"
                      >
                        <Plus size={13} /> Abono
                      </button>
                    )}
                  </div>
                </div>

                {prestamo.estado === 'mora' && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertTriangle size={13} className="text-red-400" />
                    <p className="text-red-400 text-xs font-medium">
                      {prestamo.meses_mora} mes(es) en mora · Interés acumulado: {formatearMoneda(calculo.interesMora)}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Crear Préstamo */}
      <Modal open={modalCrear} onClose={() => setModalCrear(false)} title="Nuevo préstamo">
        <form onSubmit={handleCrearPrestamo} className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">{error}</p>}
          <div>
            <label className="label-field">Cliente</label>
            <select className="select-field" required value={formulario.cliente_id}
              onChange={e => setFormulario(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Cobrador</label>
            <select className="select-field" required value={formulario.cobrador_id}
              onChange={e => setFormulario(f => ({ ...f, cobrador_id: e.target.value }))}>
              <option value="">Seleccionar cobrador...</option>
              {cobradores.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Monto prestado (COP)</label>
              <input className="input-field" type="number" required min="1" step="1"
                value={formulario.monto_prestado}
                onChange={e => setFormulario(f => ({ ...f, monto_prestado: e.target.value }))}
                onKeyDown={e => ['e','E','+','-',','].includes(e.key) && e.preventDefault()}
                placeholder="500000" />
            </div>
            <div>
              <label className="label-field">Interés mensual (%)</label>
              <input className="input-field" type="number" min="1" max="100"
                value={formulario.tasa_interes_mensual}
                onChange={e => setFormulario(f => ({ ...f, tasa_interes_mensual: e.target.value }))}
                onKeyDown={e => ['e','E','+','-',','].includes(e.key) && e.preventDefault()}
              />
            </div>
            <div>
              <label className="label-field">Fecha inicio</label>
              <input className="input-field" type="date"
                value={formulario.fecha_inicio}
                onChange={e => setFormulario(f => ({ ...f, fecha_inicio: e.target.value }))} />
            </div>
            <div>
              <label className="label-field">Fecha vencimiento</label>
              <input className="input-field" type="date" required
                value={formulario.fecha_vencimiento}
                onChange={e => setFormulario(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
            </div>
          </div>

          {formulario.monto_prestado && formulario.fecha_inicio && formulario.fecha_vencimiento && (() => {
            const monto = parseFloat(formulario.monto_prestado) || 0
            const tasa  = parseFloat(formulario.tasa_interes_mensual) / 100
            const inicio = new Date(formulario.fecha_inicio + 'T00:00:00')
            const fin    = new Date(formulario.fecha_vencimiento + 'T00:00:00')
            const meses  = Math.max(1, Math.round((fin - inicio) / (1000 * 60 * 60 * 24 * 30)))
            const interes = monto * tasa * meses
            const total   = monto + interes
            return (
              <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl space-y-1 text-sm">
                <p className="text-primary-300 font-medium">Resumen del préstamo</p>
                <div className="flex justify-between text-slate-400">
                  <span>Capital prestado</span>
                  <span className="text-white">{formatearMoneda(monto)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Interés ({formulario.tasa_interes_mensual}% × {meses} mes{meses !== 1 ? 'es' : ''})</span>
                  <span className="text-gold-400">{formatearMoneda(interes)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-white/10 pt-1 mt-1">
                  <span className="text-white">Total a cobrar</span>
                  <span className="text-white">{formatearMoneda(total)}</span>
                </div>
              </div>
            )
          })()}

          <button type="submit" disabled={guardando} className="btn-primary w-full justify-center py-3">
            {guardando ? <Spinner size="sm" /> : null}
            {guardando ? 'Creando...' : 'Crear préstamo'}
          </button>
        </form>
      </Modal>

      {/* Modal Ver Préstamo */}
      {modalVer && (
        <Modal open={!!modalVer} onClose={() => setModalVer(null)} title="Detalle del préstamo" maxWidth="max-w-xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Cliente', val: modalVer.cliente?.nombre_completo },
                { label: 'Cobrador', val: modalVer.cobrador?.nombre_completo },
                { label: 'Monto prestado', val: formatearMoneda(modalVer.monto_prestado) },
                { label: 'Interés mensual', val: `${modalVer.tasa_interes_mensual}%` },
                { label: 'Fecha inicio', val: formatearFecha(modalVer.fecha_inicio) },
                { label: 'Fecha vence', val: formatearFecha(modalVer.fecha_vencimiento) },
                { label: 'Total deuda', val: formatearMoneda(modalVer.calculo.totalDeuda) },
                { label: 'Saldo', val: formatearMoneda(modalVer.calculo.saldo) },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white/3 rounded-xl p-3">
                  <p className="text-slate-500 text-xs mb-0.5">{label}</p>
                  <p className="text-white font-semibold text-sm">{val}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium mb-2">Historial de abonos</p>
              {(modalVer.abonos || []).length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-4">Sin abonos registrados</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {[...(modalVer.abonos || [])].sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)).map(abono => (
                    <div key={abono.id} className="flex items-center justify-between px-3 py-2.5 bg-white/3 rounded-xl">
                      <div>
                        <p className="text-emerald-400 font-semibold text-sm">{formatearMoneda(abono.monto)}</p>
                        {abono.observacion && <p className="text-slate-500 text-xs">{abono.observacion}</p>}
                      </div>
                      <p className="text-slate-500 text-xs">{formatearFecha(abono.fecha_pago)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Abono */}
      {modalAbono && (
        <Modal open={!!modalAbono} onClose={() => setModalAbono(null)} title="Registrar abono">
          <form onSubmit={handleRegistrarAbono} className="space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">{error}</p>}
            <div className="p-3 bg-white/3 rounded-xl text-sm">
              <p className="text-slate-400">Cliente: <span className="text-white font-medium">{modalAbono.cliente?.nombre_completo}</span></p>
              <p className="text-slate-400 mt-1">Saldo pendiente: <span className="text-gold-400 font-bold">{formatearMoneda(modalAbono.calculo.saldo)}</span></p>
            </div>
            <div>
              <label className="label-field">Monto del abono (COP)</label>
              <input className="input-field" type="number" required min="1" step="1"
                value={montoAbono} onChange={e => setMontoAbono(e.target.value)}
                onKeyDown={e => ['e','E','+','-',','].includes(e.key) && e.preventDefault()}
                placeholder="100000" />
            </div>
            <div>
              <label className="label-field">Observación (opcional)</label>
              <input className="input-field" value={obsAbono} onChange={e => setObsAbono(e.target.value)}
                placeholder="Ej: Pago parcial semanal" />
            </div>
            <button type="submit" disabled={guardando} className="btn-gold w-full justify-center py-3">
              {guardando ? <Spinner size="sm" /> : null}
              {guardando ? 'Registrando...' : 'Registrar abono'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
