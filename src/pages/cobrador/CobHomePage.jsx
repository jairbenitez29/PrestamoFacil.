import { useEffect, useState } from 'react'
import { DollarSign, Users, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { obtenerPrestamosPorCobrador } from '../../api/prestamos.api'
import { obtenerAbonosDeCobrador_Hoy } from '../../api/abonos.api'
import { calcularSaldoPrestamo, formatearMoneda, formatearFechaCorta } from '../../utils/calculos'
import { Spinner } from '../../components/ui/Spinner'

export function CobHomePage() {
  const { perfil } = useAuth()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)

  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    if (perfil?.id) cargarDatos()
  }, [perfil])

  async function cargarDatos() {
    try {
      const [prestamos, abonosHoy] = await Promise.all([
        obtenerPrestamosPorCobrador(perfil.id),
        obtenerAbonosDeCobrador_Hoy(perfil.id),
      ])

      const prestamosConCalculo = prestamos.map(p => ({
        ...p,
        calculo: calcularSaldoPrestamo(p, p.abonos || []),
      }))

      const totalPendiente = prestamosConCalculo.reduce((s, p) => s + p.calculo.saldo, 0)
      const recaudadoHoy = abonosHoy.reduce((s, a) => s + a.monto, 0)
      const enMora = prestamos.filter(p => p.estado === 'mora').length

      setDatos({ prestamos: prestamosConCalculo, abonosHoy, totalPendiente, recaudadoHoy, enMora })
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  if (cargando) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  const { prestamos, abonosHoy, totalPendiente, recaudadoHoy, enMora } = datos

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Saludo */}
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">
          Hola, {perfil?.nombre_completo?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm capitalize">{hoy}</p>
      </div>

      {/* Resumen del día */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-900/60 to-primary-800/30 border border-primary-600/20">
        <p className="text-primary-300 text-xs font-semibold uppercase tracking-wider mb-3">Resumen de hoy</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-bold text-white">{formatearMoneda(recaudadoHoy)}</p>
            <p className="text-primary-300 text-xs">Recaudado hoy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{abonosHoy.length}</p>
            <p className="text-primary-300 text-xs">Abonos registrados</p>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <p className="text-xl font-bold text-white">{prestamos.length}</p>
          <p className="text-slate-500 text-xs mt-0.5">Clientes</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-xl font-bold text-red-400">{enMora}</p>
          <p className="text-slate-500 text-xs mt-0.5">En mora</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-lg font-bold text-gold-400 leading-tight">
            {formatearMoneda(totalPendiente)}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">Por cobrar</p>
        </div>
      </div>

      {/* Últimos abonos de hoy */}
      {abonosHoy.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Cobros de hoy</h2>
          </div>
          <div className="space-y-2">
            {abonosHoy.map(abono => (
              <div key={abono.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">
                    {abono.prestamo?.cliente?.nombre_completo}
                  </p>
                  {abono.observacion && <p className="text-slate-500 text-xs">{abono.observacion}</p>}
                </div>
                <span className="text-emerald-400 font-semibold text-sm">{formatearMoneda(abono.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Préstamos próximos a vencer */}
      {prestamos.filter(p => p.estado !== 'completado').slice(0, 4).length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-gold-400" />
            <h2 className="text-sm font-semibold text-white">Vencimientos próximos</h2>
          </div>
          <div className="space-y-2">
            {prestamos
              .filter(p => p.estado !== 'completado')
              .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
              .slice(0, 4)
              .map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{p.cliente?.nombre_completo}</p>
                    <p className="text-slate-500 text-xs">Vence: {formatearFechaCorta(p.fecha_vencimiento)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">{formatearMoneda(p.calculo.saldo)}</p>
                    {p.estado === 'mora'
                      ? <span className="badge-red text-xs">Mora</span>
                      : <span className="badge-green text-xs">Al día</span>
                    }
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
