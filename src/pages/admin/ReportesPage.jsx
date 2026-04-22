import { useEffect, useState } from 'react'
import { FileText, Download, Users, CreditCard, UserCheck, Wallet, AlertCircle } from 'lucide-react'
import { obtenerTodosLosPrestamos } from '../../api/prestamos.api'
import { obtenerTodosLosClientes } from '../../api/clientes.api'
import { obtenerTodosLosCobradores } from '../../api/perfiles.api'
import { obtenerResumenCapital, obtenerMovimientosDeCapital } from '../../api/capital.api'
import { obtenerAbonosPorCobrador } from '../../api/abonos.api'
import { Spinner } from '../../components/ui/Spinner'
import {
  generarReportePrestamos,
  generarReporteClientes,
  generarReporteCapital,
  generarReporteCobradores,
} from '../../utils/reportes'

const reportes = [
  {
    id: 'prestamos',
    titulo: 'Préstamos',
    descripcion: 'Todos los préstamos con saldos, abonos, vencimientos y estado actual.',
    icono: CreditCard,
    color: 'primary',
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    descripcion: 'Listado completo de clientes con cobrador asignado y préstamos activos.',
    icono: Users,
    color: 'gold',
  },
  {
    id: 'capital',
    titulo: 'Capital',
    descripcion: 'Resumen de capital disponible, en calle y flujo histórico de movimientos.',
    icono: Wallet,
    color: 'emerald',
  },
  {
    id: 'cobradores',
    titulo: 'Cobradores',
    descripcion: 'Equipo de cobro con clientes asignados y totales recaudados.',
    icono: UserCheck,
    color: 'primary',
  },
]

const colorMap = {
  primary: {
    icon: 'bg-primary-500/15 border-primary-500/20 text-primary-400',
    btn: 'bg-primary-600 hover:bg-primary-700 text-white',
  },
  gold: {
    icon: 'bg-gold-500/15 border-gold-500/20 text-gold-400',
    btn: 'bg-gold-500 hover:bg-gold-600 text-gray-900',
  },
  emerald: {
    icon: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
}

export function ReportesPage() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      const [prestamos, clientes, cobradores, resumenCapital, movimientos] = await Promise.all([
        obtenerTodosLosPrestamos(),
        obtenerTodosLosClientes(),
        obtenerTodosLosCobradores(),
        obtenerResumenCapital(),
        obtenerMovimientosDeCapital(),
      ])

      const abonosPorCobrador = await Promise.all(
        cobradores.map(cb => obtenerAbonosPorCobrador(cb.id).then(a => a.map(x => ({ ...x, cobrador_id: cb.id }))))
      )
      const abonos = abonosPorCobrador.flat()

      setDatos({ prestamos, clientes, cobradores, resumenCapital, movimientos, abonos })
    } catch (err) {
      setError('Error al cargar los datos para los reportes.')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  async function handleGenerar(id) {
    if (!datos) return
    setGenerando(id)
    try {
      await new Promise(r => setTimeout(r, 100))
      if (id === 'prestamos') generarReportePrestamos(datos.prestamos)
      else if (id === 'clientes') generarReporteClientes(datos.clientes)
      else if (id === 'capital') generarReporteCapital(datos.resumenCapital, datos.movimientos)
      else if (id === 'cobradores') generarReporteCobradores(datos.cobradores, datos.clientes, datos.abonos)
    } catch (err) {
      console.error(err)
    } finally {
      setGenerando(null)
    }
  }

  if (cargando) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title text-2xl">Reportes</h1>
        <p className="text-slate-500 text-sm mt-0.5">Descarga reportes en PDF con la información del sistema</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Métricas rápidas */}
      {datos && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Préstamos', val: datos.prestamos.length, sub: `${datos.prestamos.filter(p => p.estado === 'mora').length} en mora` },
            { label: 'Clientes', val: datos.clientes.length, sub: `${datos.clientes.filter(c => c.estado === 'activo').length} activos` },
            { label: 'Cobradores', val: datos.cobradores.length, sub: `${datos.cobradores.filter(c => c.activo).length} activos` },
            { label: 'Movimientos', val: datos.movimientos.length, sub: 'en capital' },
          ].map(({ label, val, sub }) => (
            <div key={label} className="card text-center py-4">
              <p className="text-2xl font-bold text-white">{val}</p>
              <p className="text-slate-400 text-sm mt-0.5">{label}</p>
              <p className="text-slate-600 text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tarjetas de reportes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportes.map(({ id, titulo, descripcion, icono: Icon, color }) => {
          const c = colorMap[color]
          const esteGenerando = generando === id
          return (
            <div key={id} className="card flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${c.icon}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base">{titulo}</h3>
                  <p className="text-slate-500 text-sm mt-0.5 leading-snug">{descripcion}</p>
                </div>
              </div>
              <button
                onClick={() => handleGenerar(id)}
                disabled={!!generando || !!error}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${c.btn}`}
              >
                {esteGenerando ? <Spinner size="sm" /> : <Download size={15} />}
                {esteGenerando ? 'Generando PDF...' : `Descargar PDF`}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-slate-600 text-xs text-center">
        Los reportes se generan con la información actual del sistema al momento de la descarga.
      </p>
    </div>
  )
}
