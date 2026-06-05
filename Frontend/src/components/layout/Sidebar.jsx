import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';
import './Sidebar.css';

// Full nav — shown before a site is selected
const NAV = [
  {
    section: null,
    items: [
      { icon: '📅', label: 'Financial Year', path: '/fy-select' },
      { icon: '🏠', label: 'Dashboard',      path: '/', exact: true },
    ],
  },
  {
    section: 'Setup',
    items: [
      { icon: '🗺️', label: 'Sites',      path: '/sites' },
      { icon: '🏢', label: 'Companies',  path: '/companies' },
      { icon: '📦', label: 'Products',   path: '/products' },
      { icon: '🚛', label: 'Vehicles',   path: '/vehicles' },
      { icon: '👨‍✈️', label: 'Drivers',  path: '/drivers' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { icon: '🔄', label: 'Transport',  path: '/trips' },
      { icon: '⛽', label: 'Diesel',     path: '/diesel' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { icon: '🛒', label: 'Purchase',      path: '/purchase' },
      { icon: '💼', label: 'Sales',         path: '/sales' },
      { icon: '🧾', label: 'Invoices',      path: '/invoices' },
      { icon: '💳', label: 'Transactions',  path: '/transactions' },
      { icon: '📊', label: 'Reports',       path: '/reports' },
    ],
  },
];

// Site-specific nav — shown after a site is selected
const SITE_NAV = [
  {
    section: null,
    items: [
      { icon: '🏠', label: 'Dashboard',    path: '/', exact: true },
    ],
  },
  {
    section: 'Site',
    items: [
      { icon: '🏢', label: 'Traders',      path: '/companies' },
      { icon: '🔄', label: 'Transport',    path: '/trips' },
      { icon: '⛽', label: 'Diesel',       path: '/diesel' },
      { icon: '🧾', label: 'Invoices',     path: '/invoices' },
      { icon: '💳', label: 'Payments',     path: '/transactions' },
      { icon: '📊', label: 'Reports',      path: '/reports' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, className = '' }) {
  const { user, logout } = useAuth();
  const { selectedSite, clearSite } = useSite();
  const location = useLocation();
  const navigate = useNavigate();

  // Use site-specific nav when a site is selected
  const activeNav = selectedSite ? SITE_NAV : NAV;

  const isActive = (item) =>
    item.exact ? location.pathname === '/' : location.pathname.startsWith(item.path);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''} ${className}`}>

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🚛</div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-brand">ELIPHAS</span>
            <span className="sidebar-brand-sub">Transport ERP</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Site badge + Change Site button */}
      {selectedSite && (
        <div className="sidebar-user" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div className="sidebar-user-avatar" style={{ background: '#16a34a' }}>🗺️</div>
          {!collapsed && (
            <div className="sidebar-user-info" style={{ flex: 1 }}>
              <span className="sidebar-user-name" style={{ color: '#16a34a' }}>{selectedSite.name}</span>
              <button
                onClick={() => { clearSite(); navigate('/sites'); }}
                style={{ fontSize:'0.68rem', color:'#64748b', background:'none', border:'none', cursor:'pointer', padding:0, marginTop:2, textAlign:'left' }}
              >
                ← Change Site
              </button>
            </div>
          )}
        </div>
      )}

      {/* User */}
      {!collapsed && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user?.name?.charAt(0)}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{user?.role}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {activeNav.map((group, gi) => (
          <div key={gi} className="sidebar-group">
            {group.section && !collapsed && (
              <div className="sidebar-section-label">{group.section}</div>
            )}
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <div
                  key={item.path}
                  className={`sidebar-item${active ? ' active' : ''}`}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : ''}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                  {active && !collapsed && <span className="sidebar-item-active-dot" />}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={logout}>
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
