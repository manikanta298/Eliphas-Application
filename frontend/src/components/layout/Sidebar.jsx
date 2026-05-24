import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  {
    icon: '⬡', label: 'Dashboard', path: '/',
    exact: true, roles: ['masterAdmin','admin','manager','staff'],
  },
  {
    icon: '🗺', label: 'Site Management', path: '/sites',
    roles: ['masterAdmin','admin','manager'],
    children: [
      { label: 'Add Site',       path: '/sites?action=add' },
      { label: 'Site List',      path: '/sites' },
      { label: 'Site Allocation', path: '/sites?tab=allocation' },
    ],
  },
  {
    icon: '🏢', label: 'Company Management', path: '/companies',
    roles: ['masterAdmin','admin','manager'],
    children: [
      { label: 'Customer List',  path: '/companies?type=customer' },
      { label: 'Supplier List',  path: '/companies?type=supplier' },
      { label: 'Vendor List',    path: '/companies?type=vendor' },
    ],
  },
  {
    icon: '📦', label: 'Product Master', path: '/products',
    roles: ['masterAdmin','admin','manager'],
    children: [
      { label: 'Product List',      path: '/products' },
      { label: 'Product Category',  path: '/products?tab=categories' },
      { label: 'GST & TDS Setup',   path: '/settings?tab=gst' },
    ],
  },
  {
    icon: '🛒', label: 'Purchase Management', path: '/purchase',
    roles: ['masterAdmin','admin','manager','staff'],
    children: [
      { label: 'Purchase Entry',    path: '/purchase?action=add' },
      { label: 'Purchase List',     path: '/purchase' },
      { label: 'Supplier Invoices', path: '/purchase?view=invoices' },
    ],
  },
  {
    icon: '💼', label: 'Sales Management', path: '/sales',
    roles: ['masterAdmin','admin','manager','staff'],
    children: [
      { label: 'Sales Entry',       path: '/sales?action=add' },
      { label: 'Sales List',        path: '/sales' },
      { label: 'Customer Invoices', path: '/invoices?type=customer' },
    ],
  },
  {
    icon: '🔄', label: 'Transport Management', path: '/trips',
    roles: ['masterAdmin','admin','manager','staff'],
    children: [
      { label: 'Trip Entry',         path: '/trips?action=add' },
      { label: 'Trip List',          path: '/trips' },
      { label: 'Transport Invoices', path: '/invoices?type=transport' },
    ],
  },
  {
    icon: '🚛', label: 'Vehicle Management', path: '/vehicles',
    roles: ['masterAdmin','admin','manager'],
    children: [
      { label: 'Own Vehicles',     path: '/vehicles?type=own' },
      { label: 'Vendor Vehicles',  path: '/vehicles?type=vendor' },
      { label: 'Vehicle Documents',path: '/vehicles?tab=documents' },
      { label: 'Vehicle Status',   path: '/vehicles?tab=status' },
    ],
  },
  {
    icon: '👨‍✈️', label: 'Driver Management', path: '/drivers',
    roles: ['masterAdmin','admin','manager'],
    children: [
      { label: 'Driver List',    path: '/drivers' },
      { label: 'License Details', path: '/drivers?tab=licenses' },
      { label: 'Driver Allocation', path: '/drivers?tab=allocation' },
    ],
  },
  {
    icon: '⛽', label: 'Diesel Management', path: '/diesel',
    roles: ['masterAdmin','admin','manager','staff'],
    children: [
      { label: 'Diesel Entry',   path: '/diesel?action=add' },
      { label: 'Diesel Reports', path: '/diesel?tab=reports' },
      { label: 'Diesel Summary', path: '/diesel?tab=summary' },
    ],
  },
  {
    icon: '🧾', label: 'Invoice Management', path: '/invoices',
    roles: ['masterAdmin','admin','manager'],
    children: [
      { label: 'All Invoices',    path: '/invoices' },
      { label: 'Invoice Print',   path: '/invoices?action=print' },
      { label: 'Invoice Reports', path: '/invoices?tab=reports' },
    ],
  },
  {
    icon: '📊', label: 'Reports', path: '/reports',
    roles: ['masterAdmin','admin','manager'],
    children: [
      { label: 'Daily Reports',   path: '/reports?type=daily' },
      { label: 'Monthly Reports', path: '/reports?type=monthly' },
      { label: 'Custom Reports',  path: '/reports?type=custom' },
    ],
  },
  {
    icon: '💳', label: 'Transactions', path: '/transactions',
    roles: ['masterAdmin','admin','manager'],
    children: [
      { label: 'Cash Transactions',  path: '/transactions?tab=cash' },
      { label: 'Advance Payments',   path: '/transactions?tab=advance' },
      { label: 'Payment History',    path: '/transactions?tab=history' },
    ],
  },
  {
    icon: '💰', label: 'Profit Analytics', path: '/profit',
    roles: ['masterAdmin','admin'], perm: 'canViewProfit',
  },
  {
    icon: '👥', label: 'User Management', path: '/users',
    roles: ['masterAdmin','admin'],
    children: [
      { label: 'Add User',           path: '/users?action=add' },
      { label: 'User List',          path: '/users' },
      { label: 'Roles & Permissions',path: '/users?tab=roles' },
    ],
  },
  { icon: '⚙️', label: 'Settings', path: '/settings', roles: ['masterAdmin','admin','manager'] },
];

export default function Sidebar({ collapsed, onToggle, className = '' }) {
  const { user, can, isRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (label) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  const canSeeItem = (item) => {
    if (!item.roles) return true;
    if (item.perm && !can(item.perm)) return false;
    return item.roles.some(r => isRole(r));
  };

  const hasActiveChild = (item) => {
    if (!item.children) return false;
    return item.children.some(c => location.pathname === c.path.split('?')[0]);
  };

  return (
    <>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''} ${className}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⬡</div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-brand">LogiCore</span>
              <span className="sidebar-brand-sub">ERP</span>
            </div>
          )}
          <button className="sidebar-toggle" onClick={onToggle}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* User info */}
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
          {NAV_ITEMS.map((item) => {
            if (!canSeeItem(item)) return null;
            const active = isActive(item);
            const childActive = hasActiveChild(item);
            const isOpen = expanded[item.label] || childActive;
            const hasChildren = item.children?.length > 0;

            return (
              <div key={item.path} className="sidebar-item-group">
                <div
                  className={`sidebar-item${active || childActive ? ' active' : ''}`}
                  onClick={() => {
                    if (hasChildren && !collapsed) {
                      toggleExpand(item.label);
                    } else {
                      navigate(item.path);
                    }
                  }}
                  title={collapsed ? item.label : ''}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="sidebar-item-label">{item.label}</span>
                      {hasChildren && (
                        <span className="sidebar-chevron" style={{
                          marginLeft: 'auto', fontSize: '0.7rem', transition: 'transform 0.2s',
                          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                          color: 'var(--clr-text3)',
                        }}>›</span>
                      )}
                    </>
                  )}
                </div>

                {/* Sub-menu */}
                {hasChildren && !collapsed && isOpen && (
                  <div className="sidebar-submenu">
                    {item.children.map(child => {
                      const childPath = child.path.split('?')[0];
                      const childActive = location.pathname === childPath;
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={`sidebar-subitem${childActive ? ' active' : ''}`}
                        >
                          <span className="sidebar-subitem-dot">›</span>
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={logout}>
            <span>⏻</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
