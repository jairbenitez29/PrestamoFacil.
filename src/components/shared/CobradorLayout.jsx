import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, ClipboardList, CheckSquare, LogOut, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/cobrador',           label: 'Inicio',    icon: Home,          end: true },
  { to: '/cobrador/clientes',  label: 'Mis Clientes', icon: ClipboardList },
  { to: '/cobrador/cobros',    label: 'Cobros Hoy', icon: CheckSquare },
]

export function CobradorLayout() {
  const { perfil, cerrarSesion } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await cerrarSesion()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#13151f]/90 backdrop-blur-md border-b border-white/8 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">PrestamosFácil</p>
              <p className="text-slate-500 text-xs">Cobrador</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-slate-300 text-xs font-medium">{perfil?.nombre_completo}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <span className="text-gray-900 font-bold text-xs">
                {perfil?.nombre_completo?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#13151f]/95 backdrop-blur-md border-t border-white/8 z-10">
        <div className="flex">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `
                flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors
                ${isActive ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}
              `}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-xs font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
