import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import './Topbar.css';

const PAGE_TITLES = {
  '/':             { title: 'Dashboard',           icon: '⬡' },
  '/sites':        { title: 'Site Management',     icon: '🗺' },
  '/vehicles':     { title: 'Vehicle Management',  icon: '🚛' },
  '/drivers':      { title: 'Driver Management',   icon: '👨‍✈️' },
  '/companies':    { title: 'Company Management',  icon: '🏢' },
  '/products':     { title: 'Product Master',      icon: '📦' },
  '/contracts':    { title: 'Contracts',           icon: '📋' },
  '/trips':        { title: 'Transport Management',icon: '🔄' },
  '/purchase':     { title: 'Purchase Management', icon: '🛒' },
  '/sales':        { title: 'Sales Management',    icon: '💼' },
  '/diesel':       { title: 'Diesel Management',   icon: '⛽' },
  '/invoices':     { title: 'Invoice Management',  icon: '🧾' },
  '/transactions': { title: 'Transactions',        icon: '💳' },
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

  const page = PAGE_TITLES[location.pathname] || { title: 'LogiCore ERP', icon: '⬡' };
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuClick}>
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

      <div className="topbar-right">
        {/* Financial Year Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text3)', whiteSpace: 'nowrap' }}>📅 FY</span>
          <select
            value={selectedFY?.label || ''}
            onChange={e => changeFY(e.target.value)}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: '1px solid var(--clr-primary)',
              background: 'var(--clr-primary)11',
              color: 'var(--clr-primary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '110px',
            }}
          >
            {financialYears.map(fy => (
              <option key={fy._id} value={fy.label}>
                {fy.label}{fy.isCurrent ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Quick stats pill */}
        <div className="topbar-pill">
          <span className="topbar-pill-dot active" />
          <span>System Live</span>
        </div>

        {/* User dropdown */}
        <div className="topbar-user" onClick={() => setDropOpen(!dropOpen)}>
          <div className="topbar-avatar">{user?.name?.charAt(0)}</div>
          <div className="topbar-user-text">
            <span className="topbar-username">{user?.name}</span>
            <span className="topbar-role">{user?.role}</span>
          </div>
          <span className="topbar-chevron">{dropOpen ? '▲' : '▼'}</span>

          {dropOpen && (
            <div className="topbar-dropdown">
              <div className="topbar-dropdown-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              {selectedFY && (
                <div className="topbar-dropdown-item" style={{ color: 'var(--clr-primary)', fontWeight: 600, pointerEvents: 'none' }}>
                  📅 FY {selectedFY.label}
                </div>
              )}
              <div className="topbar-dropdown-item" onClick={logout}>⏻ Logout</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
