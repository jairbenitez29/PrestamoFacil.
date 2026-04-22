import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, UserCheck,
  Wallet, Menu, LogOut, Bell
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/admin',            label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/clientes',   label: 'Clientes',   icon: Users },
  { to: '/admin/prestamos',  label: 'Préstamos',  icon: CreditCard },
  { to: '/admin/cobradores', label: 'Cobradores', icon: UserCheck },
  { to: '/admin/capital',    label: 'Capital',    icon: Wallet },
]

export function AdminLayout() {
  const { perfil, cerrarSesion } = useAuth()
  const [sidebarAbierto, setSidebarAbierto] = useState(false)
  const navigate = useNavigate()

  async function handleLogout() {
    await cerrarSesion()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex">
      {sidebarAbierto && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarAbierto(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-60 bg-[#0d0f18] z-30
        flex flex-col justify-between transition-transform duration-300
        ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto lg:flex-shrink-0
      `}>

        {/* Parte superior: logo + nav */}
        <div>
          {/* Logo */}
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">PrestamosFácil</p>
                <p className="text-slate-500 text-xs mt-0.5">Panel Admin</p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="px-3 space-y-0.5">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 pb-2 pt-1">
              Menú
            </p>
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarAbierto(false)}
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/20 text-sm font-medium'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 text-sm font-medium'
                }
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Perfil y logout — fijado al fondo del sidebar */}
        <div className="px-3 pb-5 pt-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 mb-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-900 font-bold text-sm">
                {perfil?.nombre_completo?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{perfil?.nombre_completo}</p>
              <p className="text-slate-500 text-xs">Administrador</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-sm font-medium"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar móvil */}
        <header className="sticky top-0 z-10 bg-[#0f1117]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between lg:hidden">
          <button onClick={() => setSidebarAbierto(true)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-white font-semibold text-sm">PrestamosFácil</span>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
            <Bell size={18} />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
