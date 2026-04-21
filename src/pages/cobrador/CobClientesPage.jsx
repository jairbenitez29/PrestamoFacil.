import { useEffect, useState } from 'react'
import { Search, MapPin, Phone, AlertTriangle, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { obtenerPrestamosPorCobrador } from '../../api/prestamos.api'
import { calcularSaldoPrestamo, formatearMoneda, formatearFecha, estaVencido } from '../../utils/calculos'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Users } from 'lucide-react'

export function CobClientesPage() {
  const { perfil } = useAuth()
  const [prestamos, setPrestamos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    if (perfil?.id) cargarDatos()
  }, [perfil])

  async function cargarDatos() {
    try {
      const data = await obtenerPrestamosPorCobrador(perfil.id)
      const conCalculo = data.map(p => ({
        ...p,
        calculo: calcularSaldoPrestamo(p, p.abonos || []),
      }))
      setPrestamos(conCalculo)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const filtrados = prestamos.filter(p =>
    p.cliente?.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.cliente?.cedula?.includes(busqueda) ||
    p.cliente?.barrio?.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (cargando) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">Mis clientes</h1>
        <p className="text-slate-500 text-sm">{prestamos.length} préstamos asignados</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input-field pl-10" placeholder="Buscar cliente, cédula o barrio..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={Users} title="Sin clientes asignados"
          description="El administrador te asignará clientes próximamente." />
      ) : (
        <div className="space-y-3">
          {filtrados.map((prestamo) => {
            const { calculo } = prestamo
            const vencido = estaVencido(prestamo.fecha_vencimiento)
            return (
              <button
                key={prestamo.id}
                onClick={() => setSeleccionado(prestamo)}
                className="w-full card text-left hover:border-white/20 hover:bg-white/8 transition-all active:scale-98"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    prestamo.estado === 'mora' ? 'bg-red-500/20' : 'bg-primary-600/20'
                  }`}>
                    <span className={`font-bold text-base ${prestamo.estado === 'mora' ? 'text-red-400' : 'text-primary-400'}`}>
                      {prestamo.cliente?.nombre_completo?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{prestamo.cliente?.nombre_completo}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {prestamo.cliente?.barrio && (
                        <span className="flex items-center gap-1 text-slate-500 text-xs">
                          <MapPin size={10} /> {prestamo.cliente.barrio}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {prestamo.estado === 'mora'
                      ? <span className="badge-red">Mora</span>
                      : vencido
                        ? <span className="badge-yellow">Vencido</span>
                        : <span className="badge-green">Al día</span>
                    }
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 text-xs">Saldo pendiente</span>
                  <span className="text-white font-bold text-sm">{formatearMoneda(calculo.saldo)}</span>
                </div>
                <ProgressBar
                  porcentaje={calculo.porcentajePagado}
                  colorClass={prestamo.estado === 'mora' ? 'bg-red-500' : 'bg-emerald-500'}
                  height="h-1.5"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-600 text-xs">
                    {formatearMoneda(calculo.totalAbonado)} pagado de {formatearMoneda(calculo.totalDeuda)}
                  </span>
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modal Detalle Cliente */}
      {seleccionado && (
        <Modal open={!!seleccionado} onClose={() => setSeleccionado(null)} title="Detalle del cliente">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white/3 rounded-xl">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">{seleccionado.cliente?.nombre_completo?.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-white font-bold">{seleccionado.cliente?.nombre_completo}</h3>
                <p className="text-slate-500 text-xs">CC: {seleccionado.cliente?.cedula || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Teléfono', val: seleccionado.cliente?.telefono },
                { label: 'Barrio', val: seleccionado.cliente?.barrio },
                { label: 'Dirección', val: seleccionado.cliente?.direccion },
                { label: 'Vencimiento', val: formatearFecha(seleccionado.fecha_vencimiento) },
                { label: 'Monto prestado', val: formatearMoneda(seleccionado.calculo.montoOriginal) },
                { label: 'Saldo actual', val: formatearMoneda(seleccionado.calculo.saldo) },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white/3 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">{label}</p>
                  <p className="text-white font-medium text-sm mt-0.5">{val || '—'}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium mb-2">Abonos recientes</p>
              {(seleccionado.abonos || []).length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-3">Sin abonos</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                  {[...(seleccionado.abonos || [])].sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago)).map(a => (
                    <div key={a.id} className="flex justify-between items-center px-3 py-2 bg-white/3 rounded-xl">
                      <span className="text-emerald-400 font-semibold text-sm">{formatearMoneda(a.monto)}</span>
                      <span className="text-slate-500 text-xs">{formatearFecha(a.fecha_pago)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
