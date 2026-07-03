import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { to: '/',           label: 'Dashboard',   icon: '◈' },
  { to: '/connections', label: 'Conexiones', icon: '⬡' },
  { to: '/protection', label: 'Protección de Datos', icon: '▣' },
  { to: '/jobs',       label: 'Historial',         icon: '▶' },
];

const adminItems: NavItem[] = [
  { to: '/admin', label: 'Admin', icon: '◆' },
];

export default function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🎭</div>
        <span className="logo-text">Enmask</span>
        <span className="logo-badge">SDM</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="nav-section-label">Plataforma</span>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <span className="nav-section-label">Gobierno</span>
            {adminItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <p className="version-badge">Enmask v1.0.0 · Data Protection</p>
      </div>
    </aside>
  );
}
