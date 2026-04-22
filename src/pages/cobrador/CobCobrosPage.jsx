import { useEffect, useState } from 'react'
import { Plus, CheckCircle2, Clock, AlertTriangle, DollarSign } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { obtenerPrestamosPorCobrador } from '../../api/prestamos.api'
import { registrarAbono, obtenerAbonosDeCobrador_Hoy } from '../../api/abonos.api'
import { registrarMovimientoDeCapital } from '../../api/capital.api'
import { actualizarEstadoPrestamo } from '../../api/prestamos.api'
import { calcularSaldoPrestamo, formatearMoneda, formatearFecha, estaVencido } from '../../utils/calculos'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'

export function CobCobrosPage() {
  const { perfil } = useAuth()
  const [prestamos, setPrestamos] = useState([])
  const [abonosHoy, setAbonosHoy] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbono, setModalAbono] = useState(null)
  const [monto, setMonto] = useState('')
  const [obs, setObs] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    if (perfil?.id) cargarDatos()
  }, [perfil])

  async function cargarDatos() {
    try {
      const [p, a] = await Promise.all([
        obtenerPrestamosPorCobrador(perfil.id),
        obtenerAbonosDeCobrador_Hoy(perfil.id),
      ])
      const conCalculo = p.map(pr => ({
        ...pr,
        calculo: calcularSaldoPrestamo(pr, pr.abonos || []),
      }))
      setPrestamos(conCalculo)
      setAbonosHoy(a)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleRegistrarAbono(e) {
    e.preventDefault()
    setError('')
    setExito('')
    setGuardando(true)
    try {
      const montoNum = parseFloat(monto)
      await registrarAbono({
        prestamo_id: modalAbono.id,
        cobrador_id: perfil.id,
        monto: montoNum,
        fecha_pago: new Date().toISOString().split('T')[0],
        observacion: obs || null,
      })
      await registrarMovimientoDeCapital({
        tipo: 'ingreso',
        monto: montoNum,
        descripcion: `Abono de ${modalAbono.cliente?.nombre_completo}`,
        created_by: perfil.id,
      })

      const nuevoSaldo = modalAbono.calculo.saldo - montoNum
      if (nuevoSaldo <= 0) {
        await actualizarEstadoPrestamo(modalAbono.id, 'completado')
      }

      setExito(`Abono de ${formatearMoneda(montoNum)} registrado exitosamente`)
      setTimeout(() => {
        setModalAbono(null)
        setExito('')
        setMonto('')
        setObs('')
        cargarDatos()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Error al registrar el abono')
    } finally {
      setGuardando(false)
    }
  }

  const totalHoy = abonosHoy.reduce((s, a) => s + a.monto, 0)
  const pendientes = prestamos.filter(p => p.estado !== 'completado')
  const enMora = pendientes.filter(p => p.estado === 'mora')

  if (cargando) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">Cobros del día</h1>
        <p className="text-slate-500 text-sm capitalize">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <p className="text-xl font-bold text-emerald-400">{abonosHoy.length}</p>
          <p className="text-slate-500 text-xs">Cobros hoy</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-lg font-bold text-white leading-tight text-sm">
            {formatearMoneda(totalHoy).replace('COP', '').trim()}
          </p>
          <p className="text-slate-500 text-xs">Recaudado</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xl font-bold text-red-400">{enMora.length}</p>
          <p className="text-slate-500 text-xs">En mora</p>
        </div>
      </div>

      {/* Mora primero */}
      {enMora.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-400" />
            <p className="text-sm font-semibold text-red-400">En mora ({enMora.length})</p>
          </div>
          <div className="space-y-2.5">
            {enMora.map(p => <TarjetaCobro key={p.id} prestamo={p} abonosHoy={abonosHoy} onCobrar={() => { setModalAbono(p); setMonto(''); setObs(''); setError('') }} />)}
          </div>
        </div>
      )}

      {/* Pendientes normales */}
      {pendientes.filter(p => p.estado !== 'mora').length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-400">Pendientes ({pendientes.filter(p => p.estado !== 'mora').length})</p>
          </div>
          <div className="space-y-2.5">
            {pendientes.filter(p => p.estado !== 'mora').map(p => (
              <TarjetaCobro key={p.id} prestamo={p} abonosHoy={abonosHoy}
                onCobrar={() => { setModalAbono(p); setMonto(''); setObs(''); setError('') }} />
            ))}
          </div>
        </div>
      )}

      {pendientes.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="¡Todo al día!"
          description="No tienes cobros pendientes por el momento."
        />
      )}

      {/* Modal Abono */}
      <Modal open={!!modalAbono} onClose={() => !guardando && setModalAbono(null)} title="Registrar cobro">
        {exito ? (
          <div className="py-6 text-center">
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-emerald-400 font-semibold">{exito}</p>
          </div>
        ) : (
          <form onSubmit={handleRegistrarAbono} className="space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">{error}</p>}

            {modalAbono && (
              <div className="p-4 bg-white/3 rounded-xl space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-700/40 flex items-center justify-center">
                    <span className="text-primary-300 font-bold">{modalAbono.cliente?.nombre_completo?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{modalAbono.cliente?.nombre_completo}</p>
                    <p className="text-slate-500 text-xs">{modalAbono.cliente?.direccion}</p>
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/8">
                  <span className="text-slate-400 text-sm">Saldo total</span>
                  <span className="text-gold-400 font-bold">{formatearMoneda(modalAbono.calculo.saldo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Vence</span>
                  <span className="text-slate-300 text-sm">{formatearFecha(modalAbono.fecha_vencimiento)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="label-field">Monto a cobrar (COP) *</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input-field pl-10 text-lg font-semibold"
                  type="number" required min="1" step="1"
                  value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="label-field">Observación</label>
              <input className="input-field" value={obs} onChange={e => setObs(e.target.value)}
                placeholder="Ej: Abono semanal, pago completo..." />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => setModalAbono(null)} disabled={guardando}
                className="btn-secondary justify-center py-3">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="btn-gold justify-center py-3">
                {guardando ? <Spinner size="sm" /> : <CheckCircle2 size={16} />}
                {guardando ? 'Registrando...' : 'Cobrar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function TarjetaCobro({ prestamo, abonosHoy, onCobrar }) {
  const cobradoHoy = abonosHoy
    .filter(a => a.prestamo_id === prestamo.id || a.prestamo?.id === prestamo.id)
    .reduce((s, a) => s + a.monto, 0)

  const esMora = prestamo.estado === 'mora'

  return (
    <div className={`card border ${esMora ? 'border-red-500/20' : 'border-white/10'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            esMora ? 'bg-red-500/20' : 'bg-primary-600/20'
          }`}>
            <span className={`font-bold text-base ${esMora ? 'text-red-400' : 'text-primary-400'}`}>
              {prestamo.cliente?.nombre_completo?.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{prestamo.cliente?.nombre_completo}</p>
            <p className="text-slate-500 text-xs">{prestamo.cliente?.barrio || prestamo.cliente?.direccion || '—'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-sm">{formatearMoneda(prestamo.calculo.saldo)}</p>
          <p className="text-slate-500 text-xs">por cobrar</p>
        </div>
      </div>

      {cobradoHoy > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">
            Cobrado hoy: {formatearMoneda(cobradoHoy)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-slate-600 text-xs">
          Vence: {formatearFecha(prestamo.fecha_vencimiento)}
          {esMora && <span className="text-red-500 ml-2">· {prestamo.meses_mora} mes(es) mora</span>}
        </p>
        <button onClick={onCobrar} className="btn-gold text-xs py-2 px-4">
          <Plus size={12} /> Cobrar
        </button>
      </div>
    </div>
  )
}
