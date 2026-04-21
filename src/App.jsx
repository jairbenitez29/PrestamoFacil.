import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { AdminLayout } from './components/shared/AdminLayout'
import { CobradorLayout } from './components/shared/CobradorLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { ClientesPage } from './pages/admin/ClientesPage'
import { PrestamosPage } from './pages/admin/PrestamosPage'
import { CobradoresPage } from './pages/admin/CobradoresPage'
import { CapitalPage } from './pages/admin/CapitalPage'
import { CobHomePage } from './pages/cobrador/CobHomePage'
import { CobClientesPage } from './pages/cobrador/CobClientesPage'
import { CobCobrosPage } from './pages/cobrador/CobCobrosPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin" element={
            <ProtectedRoute rolRequerido="admin">
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="prestamos" element={<PrestamosPage />} />
            <Route path="cobradores" element={<CobradoresPage />} />
            <Route path="capital" element={<CapitalPage />} />
          </Route>

          <Route path="/cobrador" element={
            <ProtectedRoute rolRequerido="cobrador">
              <CobradorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CobHomePage />} />
            <Route path="clientes" element={<CobClientesPage />} />
            <Route path="cobros" element={<CobCobrosPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
