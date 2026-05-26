import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import './Topbar.css';

const PAGE_TITLES = {
  '/':             { title: 'Home',                icon: '🏠' },
  '/sites':        { title: 'Site Management',     icon: '🗺️' },
  '/vehicles':     { title: 'Vehicle Management',  icon: '🚛' },
  '/drivers':      { title: 'Driver Management',   icon: '👨‍✈️' },
  '/companies':    { title: 'Company Management',  icon: '🏢' },
  '/products':     { title: 'Product Master',      icon: '📦' },
  '/contracts':    { title: 'Contracts',           icon: '📋' },
  '/purchase':     { title: 'Purchase Management', icon: '🛒' },
  '/sales':        { title: 'Sales Management',    icon: '💼' },
  '/trips':        { title: 'Transport Management',icon: '🔄' },
  '/diesel':       { title: 'Diesel Management',   icon: '⛽' },
  '/invoices':     { title: 'Invoice Management',  icon: '🧾' },
  '/transactions': { title: 'Payments & Receipts', icon: '💳' },
  '/reports':      { title: 'Reports & Analytics', icon: '📊' },
  '/profit':       { title: 'Profit Analytics',    icon: '💰' },
  '/settings':     { title: 'Settings',            icon: '⚙️' },
  '/users':        { title: 'User Management',     icon: '👥' },
  '/activity':     { title: 'Activity Logs',       icon: '🕐' },
};

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { financialYears, selectedFY, changeFY } = useFY();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);

  const page = PAGE_TITLES[location.pathname] || { title: 'Dashboard', icon: '🏠' };
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <header className="topbar">
      {/* Left */}
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
        <div className="topbar-page-info">
          <span className="topbar-page-icon">{page.icon}</span>
          <div>
            <h1 className="topbar-title">{page.title}</h1>
            <p className="topbar-date">{dateStr}</p>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="topbar-right">
        {/* FY Selector */}
        <div className="topbar-fy-selector">
          <span className="topbar-fy-label">FY</span>
          <select
            className="topbar-fy-select"
            value={selectedFY?.label || ''}
            onChange={e => changeFY(e.target.value)}
          >
            {financialYears.map(fy => (
              <option key={fy._id} value={fy.label}>
                {fy.label}{fy.isCurrent ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Live pill */}
        <div className="topbar-pill">
          <span className="topbar-pill-dot" />
          Live
        </div>

        {/* Notification */}
        <button className="topbar-icon-btn" aria-label="Notifications">🔔</button>

        {/* User dropdown */}
        <div className="topbar-user" onClick={() => setDropOpen(!dropOpen)}>
          <div className="topbar-avatar">{user?.name?.charAt(0)}</div>
          <div className="topbar-user-text">
            <span className="topbar-username">{user?.name}</span>
            <span className="topbar-role">{user?.role}</span>
          </div>
          <span className="topbar-chevron">{dropOpen ? '▲' : '▼'}</span>

          {dropOpen && (
            <div className="topbar-dropdown" onClick={e => e.stopPropagation()}>
              <div className="topbar-dropdown-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              {selectedFY && (
                <div className="topbar-dropdown-item" style={{ color: 'var(--clr-primary)', fontWeight: 700, pointerEvents: 'none' }}>
                  📅 FY {selectedFY.label}
                </div>
              )}
              <div className="topbar-dropdown-item" onClick={() => window.location.href = '/settings'}>
                ⚙️ Settings
              </div>
              <div className="topbar-dropdown-item" style={{ color: 'var(--clr-danger)' }} onClick={logout}>
                🚪 Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
