import { useEffect, useState } from 'react'
import { Plus, TrendingUp, TrendingDown, Wallet, DollarSign, ArrowUpRight, ArrowDownRight, ArrowUp, ArrowDown } from 'lucide-react'
import { obtenerResumenCapital, obtenerMovimientosDeCapital, registrarMovimientoDeCapital } from '../../api/capital.api'
import { useAuth } from '../../contexts/AuthContext'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { StatCard } from '../../components/ui/StatCard'
import { formatearMoneda, formatearFecha } from '../../utils/calculos'

export function CapitalPage() {
  const { perfil } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalMovimiento, setModalMovimiento] = useState(false)
  const [formulario, setFormulario] = useState({ tipo: 'ingreso', monto: '', descripcion: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const [r, m] = await Promise.all([obtenerResumenCapital(), obtenerMovimientosDeCapital()])
      setResumen(r)
      setMovimientos(m)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleRegistrarMovimiento(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await registrarMovimientoDeCapital({
        tipo: formulario.tipo,
        monto: parseFloat(formulario.monto),
        descripcion: formulario.descripcion,
        created_by: perfil.id,
      })
      await cargarDatos()
      setModalMovimiento(false)
      setFormulario({ tipo: 'ingreso', monto: '', descripcion: '' })
    } catch (err) {
      setError(err.message || 'Error al registrar movimiento')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="section-title text-2xl">Control de Capital</h1>
          <p className="text-slate-500 text-sm mt-0.5">Flujo de dinero del negocio</p>
        </div>
        <button onClick={() => { setFormulario({ tipo: 'ingreso', monto: '', descripcion: '' }); setError(''); setModalMovimiento(true) }} className="btn-primary">
          <Plus size={16} /> Registrar movimiento
        </button>
      </div>

      {/* Métricas de capital */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard titulo="Capital disponible" valor={formatearMoneda(resumen.capitalDisponible)}
          icono={Wallet} colorIcono={resumen.capitalDisponible >= 0 ? 'emerald' : 'red'}
          subtitulo="Listo para prestar" />
        <StatCard titulo="En calle" valor={formatearMoneda(resumen.capitalEnCalle)}
          icono={DollarSign} colorIcono="primary" subtitulo="Actualmente prestado" />
        <StatCard titulo="Total ingresado" valor={formatearMoneda(resumen.totalIngresado)}
          icono={TrendingUp} colorIcono="emerald" subtitulo="Capital histórico" />
        <StatCard titulo="Total recaudado" valor={formatearMoneda(resumen.totalRecaudado)}
          icono={TrendingUp} colorIcono="gold" subtitulo="Abonos recibidos" />
      </div>

      {/* Gráfico visual de distribución */}
      <div className="card">
        <h2 className="section-title mb-4">Distribución del capital</h2>
        <div className="space-y-3">
          {[
            {
              label: 'Capital en calle',
              monto: resumen.capitalEnCalle,
              total: resumen.totalIngresado,
              color: 'bg-primary-500',
              textColor: 'text-primary-400',
            },
            {
              label: 'Capital disponible',
              monto: Math.max(0, resumen.capitalDisponible),
              total: resumen.totalIngresado,
              color: 'bg-emerald-500',
              textColor: 'text-emerald-400',
            },
            {
              label: 'Total recaudado',
              monto: resumen.totalRecaudado,
              total: resumen.totalIngresado + resumen.totalRecaudado,
              color: 'bg-gold-500',
              textColor: 'text-gold-400',
            },
          ].map(({ label, monto, total, color, textColor }) => {
            const pct = total > 0 ? Math.min(100, (monto / total) * 100) : 0
            return (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className={`font-semibold ${textColor}`}>{formatearMoneda(monto)}</span>
                </div>
                <div className="h-2.5 bg-white/8 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-600 text-right">{pct.toFixed(1)}%</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Historial de movimientos */}
      <div className="card">
        <h2 className="section-title mb-4">Historial de movimientos</h2>
        {movimientos.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No hay movimientos registrados.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin -mx-5 px-5">
            {movimientos.map((mov) => (
              <div key={mov.id} className="flex items-center gap-4 p-3.5 bg-white/3 hover:bg-white/5 rounded-xl transition-colors border border-white/5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  mov.tipo === 'ingreso' ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-red-500/15 border border-red-500/20'
                }`}>
                  {mov.tipo === 'ingreso'
                    ? <ArrowUpRight size={16} className="text-emerald-400" />
                    : <ArrowDownRight size={16} className="text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{mov.descripcion}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{formatearFecha(mov.created_at?.split('T')[0])}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${mov.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {mov.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(mov.monto)}
                  </p>
                  <p className={`text-xs capitalize ${mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {mov.tipo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalMovimiento} onClose={() => setModalMovimiento(false)} title="Registrar movimiento de capital">
        <form onSubmit={handleRegistrarMovimiento} className="space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">{error}</p>}
          <div>
            <label className="label-field">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-3">
              {['ingreso', 'egreso'].map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFormulario(f => ({ ...f, tipo }))}
                  className={`py-3 rounded-xl border font-medium text-sm capitalize transition-all flex items-center justify-center gap-2 ${
                    formulario.tipo === tipo
                      ? tipo === 'ingreso'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {tipo === 'ingreso'
                    ? <><ArrowUp size={14} /><span>Ingreso</span></>
                    : <><ArrowDown size={14} /><span>Egreso</span></>
                  }
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">Monto (COP)</label>
            <input className="input-field" type="number" required min="1" step="1"
              value={formulario.monto} onChange={e => setFormulario(f => ({ ...f, monto: e.target.value }))}
              onKeyDown={e => ['e','E','+','-',','].includes(e.key) && e.preventDefault()}
              placeholder="1000000" />
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <input className="input-field" required value={formulario.descripcion}
              onChange={e => setFormulario(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Ej: Capital inicial del negocio" />
          </div>
          <button type="submit" disabled={guardando} className="btn-primary w-full justify-center py-3">
            {guardando ? <Spinner size="sm" /> : null}
            {guardando ? 'Registrando...' : 'Registrar movimiento'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
