import { useEffect, useState } from 'react'
import {
  DollarSign, Users, CreditCard, AlertTriangle,
  TrendingUp, UserCheck, Calendar, ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { obtenerResumenCapital } from '../../api/capital.api'
import { obtenerTodosLosPrestamos } from '../../api/prestamos.api'
import { obtenerTodosLosClientes } from '../../api/clientes.api'
import { obtenerTodosLosCobradores } from '../../api/perfiles.api'
import { obtenerResumenAbonosPorFecha } from '../../api/abonos.api'
import { StatCard } from '../../components/ui/StatCard'
import { Spinner } from '../../components/ui/Spinner'
import { formatearMoneda, formatearFechaCorta, calcularSaldoPrestamo, estaVencido } from '../../utils/calculos'

export function DashboardPage() {
  const { perfil } = useAuth()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)

  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [capital, prestamos, clientes, cobradores, abonosHoy] = await Promise.all([
        obtenerResumenCapital(),
        obtenerTodosLosPrestamos(),
        obtenerTodosLosClientes(),
        obtenerTodosLosCobradores(),
        obtenerResumenAbonosPorFecha(
          new Date().toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        ),
      ])

      const prestamosActivos = prestamos.filter(p => p.estado === 'activo')
      const prestamosMora = prestamos.filter(p => p.estado === 'mora')
      const recaudadoHoy = abonosHoy.reduce((s, a) => s + a.monto, 0)

      const prestamosCriticos = prestamos
        .filter(p => p.estado !== 'completado')
        .map(p => ({
          ...p,
          calculo: calcularSaldoPrestamo(p, p.abonos || []),
        }))
        .filter(p => p.calculo.saldo > 0)
        .sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
        .slice(0, 5)

      setDatos({ capital, prestamosActivos, prestamosMora, clientes, cobradores, recaudadoHoy, prestamosCriticos, totalPrestamos: prestamos.length })
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const { capital, prestamosActivos, prestamosMora, clientes, cobradores, recaudadoHoy, prestamosCriticos } = datos

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bienvenido, {perfil?.nombre_completo?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{hoy}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">Sistema activo</span>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titulo="Capital en calle"
          valor={formatearMoneda(capital.capitalEnCalle)}
          icono={DollarSign}
          colorIcono="primary"
          subtitulo={`${prestamosActivos.length + prestamosMora.length} préstamos activos`}
        />
        <StatCard
          titulo="Disponible"
          valor={formatearMoneda(capital.capitalDisponible)}
          icono={Wallet}
          colorIcono="emerald"
          subtitulo="Para nuevos préstamos"
        />
        <StatCard
          titulo="Recaudado hoy"
          valor={formatearMoneda(recaudadoHoy)}
          icono={TrendingUp}
          colorIcono="gold"
          subtitulo="Total de abonos del día"
        />
        <StatCard
          titulo="En mora"
          valor={prestamosMora.length}
          icono={AlertTriangle}
          colorIcono="red"
          subtitulo="Préstamos vencidos"
        />
      </div>

      {/* Segunda fila de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titulo="Total clientes"
          valor={clientes.length}
          icono={Users}
          colorIcono="slate"
        />
        <StatCard
          titulo="Cobradores"
          valor={cobradores.filter(c => c.activo).length}
          icono={UserCheck}
          colorIcono="primary"
          subtitulo={`${cobradores.length} registrados`}
        />
        <StatCard
          titulo="Total prestado"
          valor={formatearMoneda(capital.totalIngresado)}
          icono={CreditCard}
          colorIcono="gold"
          subtitulo="Capital histórico"
        />
        <StatCard
          titulo="Total recaudado"
          valor={formatearMoneda(capital.totalRecaudado)}
          icono={TrendingUp}
          colorIcono="emerald"
          subtitulo="Abonos históricos"
        />
      </div>

      {/* Tabla de préstamos próximos a vencer */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold-500/15 border border-gold-500/20 flex items-center justify-center">
              <Calendar size={16} className="text-gold-400" />
            </div>
            <h2 className="section-title">Préstamos prioritarios</h2>
          </div>
          <Link to="/admin/prestamos" className="flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {prestamosCriticos.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">No hay préstamos pendientes.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="table-header text-left pb-3">Cliente</th>
                  <th className="table-header text-right pb-3">Saldo</th>
                  <th className="table-header text-center pb-3 hidden sm:table-cell">Vence</th>
                  <th className="table-header text-center pb-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {prestamosCriticos.map((prestamo) => {
                  const vencido = estaVencido(prestamo.fecha_vencimiento)
                  return (
                    <tr key={prestamo.id} className="table-row">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-white leading-none">
                          {prestamo.cliente?.nombre_completo}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">{prestamo.cobrador?.nombre_completo || 'Sin cobrador'}</p>
                      </td>
                      <td className="py-3.5 text-right font-semibold text-white">
                        {formatearMoneda(prestamo.calculo.saldo)}
                      </td>
                      <td className="py-3.5 text-center text-slate-400 hidden sm:table-cell">
                        {formatearFechaCorta(prestamo.fecha_vencimiento)}
                      </td>
                      <td className="py-3.5 text-center">
                        {prestamo.estado === 'mora'
                          ? <span className="badge-red">Mora</span>
                          : vencido
                            ? <span className="badge-yellow">Por vencer</span>
                            : <span className="badge-green">Al día</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cobradores activos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center">
              <UserCheck size={16} className="text-primary-400" />
            </div>
            <h2 className="section-title">Equipo de cobro</h2>
          </div>
          <Link to="/admin/cobradores" className="flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">
            Gestionar <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cobradores.filter(c => c.activo).map((cobrador) => (
            <div key={cobrador.id} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/8">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {cobrador.nombre_completo.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{cobrador.nombre_completo}</p>
                <p className="text-slate-500 text-xs">{cobrador.telefono || 'Sin teléfono'}</p>
              </div>
              <span className="badge-green">Activo</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Wallet(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" />
    </svg>
  )
}
