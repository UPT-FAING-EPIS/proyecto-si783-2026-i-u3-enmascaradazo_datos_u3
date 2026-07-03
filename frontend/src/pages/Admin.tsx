import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUsers } from '../services/api';
import type { User } from '../types';

export default function Admin({ addToast }: { addToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    getUsers()
      .then(setUsers)
      .catch((err: Error) => addToast(err.message || 'No se pudo cargar usuarios', 'error'))
      .finally(() => setLoading(false));
  }, [addToast, user?.role]);

  const stats = useMemo(() => {
    const admins = users.filter((item) => item.role === 'admin').length;
    return { total: users.length, admins, normal: users.length - admins };
  }, [users]);

  if (user?.role !== 'admin') {
    return (
      <div className="page-content">
        <div className="card empty-state">
          <div className="empty-icon">🔒</div>
          <h3>Acceso restringido</h3>
          <p>Este módulo solo está disponible para usuarios con rol administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'color-mix(in srgb, var(--color-accent) 13%, transparent)' }}>👥</div>
          <div className="stat-info"><div className="stat-value">{stats.total}</div><div className="stat-label">Usuarios registrados</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 211, 165, 0.12)' }}>🛡️</div>
          <div className="stat-info"><div className="stat-value">{stats.admins}</div><div className="stat-label">Administradores</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>👤</div>
          <div className="stat-info"><div className="stat-value">{stats.normal}</div><div className="stat-label">Usuarios estándar</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>Gestión administrativa</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
              Vista de control para revisar cuentas con acceso al sistema. Los cambios de rol se gestionan desde ADMIN_EMAILS en el backend.
            </p>
          </div>
          {loading && <span className="badge badge-pending">Cargando</span>}
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td><span className="cell-primary">{item.name}</span></td>
                  <td>{item.email}</td>
                  <td><span className={`badge ${item.role === 'admin' ? 'badge-success' : 'badge-info'}`}>{item.role}</span></td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr><td colSpan={3}>No hay usuarios registrados todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
