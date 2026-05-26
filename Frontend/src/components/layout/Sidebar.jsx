import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

// ── Simple 3-section sidebar matching image ──────────────────
const NAV = [
  {
    section: null, // no section label for main items
    items: [
      { icon: '🏠', label: 'Home',       path: '/', exact: true },
    ],
  },
  {
    section: 'Operations',
    items: [
      { icon: '💼', label: 'Sales',       path: '/sales' },
      { icon: '🛒', label: 'Purchase',    path: '/purchase' },
      { icon: '🔄', label: 'Transport',   path: '/trips' },
      { icon: '⛽', label: 'Diesel',      path: '/diesel' },
    ],
  },
  {
    section: 'Management',
    items: [
      { icon: '🗺️', label: 'Sites',       path: '/sites' },
      { icon: '🏢', label: 'Companies',   path: '/companies' },
      { icon: '📦', label: 'Products',    path: '/products' },
      { icon: '🚛', label: 'Vehicles',    path: '/vehicles' },
      { icon: '👨‍✈️', label: 'Drivers',    path: '/drivers' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { icon: '🧾', label: 'Invoices',    path: '/invoices' },
      { icon: '💳', label: 'Payments',    path: '/transactions' },
      { icon: '📊', label: 'Reports',     path: '/reports' },
      { icon: '💰', label: 'Profit',      path: '/profit', adminOnly: true },
    ],
  },
  {
    section: 'Admin',
    items: [
      { icon: '👥', label: 'Users',       path: '/users',    adminOnly: true },
      { icon: '⚙️', label: 'Settings',    path: '/settings' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle, className = '' }) {
  const { user, can, isRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = isRole('masterAdmin', 'admin');

  const isActive = (item) =>
    item.exact ? location.pathname === '/' : location.pathname.startsWith(item.path);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''} ${className}`}>

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🐕</div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-brand">DOG'S ERP</span>
            <span className="sidebar-brand-sub">Dashboard</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* ── User ── */}
      {!collapsed && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{user?.name?.charAt(0)}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{user?.role}</span>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {NAV.map((group, gi) => (
          <div key={gi} className="sidebar-group">

            {/* Section label */}
            {group.section && !collapsed && (
              <div className="sidebar-section-label">{group.section}</div>
            )}

            {group.items.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              const active = isActive(item);
              return (
                <div
                  key={item.path}
                  className={`sidebar-item${active ? ' active' : ''}`}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : ''}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  {!collapsed && (
                    <span className="sidebar-item-label">{item.label}</span>
                  )}
                  {active && !collapsed && (
                    <span className="sidebar-item-active-dot" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Logout ── */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={logout}>
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
