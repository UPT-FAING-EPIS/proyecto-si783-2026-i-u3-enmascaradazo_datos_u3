import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import ThemeToggle from './components/ThemeToggle';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import Jobs from './pages/Jobs';
import DataProtection from './pages/DataProtection';
import Login from './pages/Login';
import Admin from './pages/Admin';
import { useToast } from './hooks/useToast';
import { AuthProvider, ProtectedRoute, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { RESOLVED_API_BASE } from './services/api';

const topbarMeta: Record<string, { title: string; desc: string }> = {
  '/': { title: 'Dashboard', desc: 'Panel ejecutivo de conexiones, reglas y jobs de protección' },
  '/connections': { title: 'Conexiones', desc: 'Administra motores relacionales, NoSQL y grafos' },
  '/protection': { title: 'Protección de Datos', desc: 'Selecciona conexión, carga tablas, previsualiza y ejecuta protecciones' },
  '/jobs': { title: 'Historial de Jobs', desc: 'Auditoría de ejecuciones, dry-runs y desenmascaramientos' },
  '/admin': { title: 'Administración', desc: 'Control de usuarios, roles y accesos privilegiados' },
};

function Topbar() {
  const { user, logout } = useAuth();
  const path = window.location.pathname;
  const meta = topbarMeta[path] ?? topbarMeta['/'];

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{meta.title}</h1>
        <p>{meta.desc}</p>
      </div>
      <div className="topbar-actions">
        <ThemeToggle />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          API:{' '}
          <code style={{ color: 'var(--color-accent-2)' }}>{RESOLVED_API_BASE}</code>
        </span>
        {user && (
          <div className="user-badge">
            <span>{user.name} · {user.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
            <button className="btn btn-clear" onClick={logout}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </header>
  );
}

function AppLayout({ addToast }: { addToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/connections" element={<Connections addToast={addToast} />} />
          <Route path="/protection" element={<DataProtection addToast={addToast} />} />
          <Route path="/rules" element={<Navigate to="/protection" replace />} />
          <Route path="/workbench" element={<Navigate to="/protection" replace />} />
          <Route path="/jobs" element={<Jobs addToast={addToast} />} />
          <Route path="/admin" element={<Admin addToast={addToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function AppRouter({ addToast }: { addToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  return (
    <Routes>
      <Route path="/login" element={<Login addToast={addToast} />} />
      <Route path="/*" element={<ProtectedRoute><AppLayout addToast={addToast} /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  const { toasts, addToast } = useToast();

  return (
    <ThemeProvider>
      <AuthProvider>
      <BrowserRouter>
        <AppRouter addToast={addToast} />
      </BrowserRouter>
      <ToastContainer toasts={toasts} />
      </AuthProvider>
    </ThemeProvider>
  );
}
