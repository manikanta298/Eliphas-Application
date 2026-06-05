import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinancialYearProvider } from './contexts/FinancialYearContext';
import { SiteProvider } from './contexts/SiteContext';

import Sidebar      from './components/layout/Sidebar';
import Topbar       from './components/layout/Topbar';

import Login            from './pages/auth/Login';
import ForgotPassword   from './pages/auth/ForgotPassword';
import ResetPassword    from './pages/auth/ResetPassword';
import FYSelectPage     from './pages/fy-select/FYSelect';
import Dashboard        from './pages/dashboard/Dashboard';
import { SitesPage }   from './pages/sites/Sites';
import VehiclesPage     from './pages/vehicles/Vehicles';
import ProductsPage     from './pages/products/Products';
import TripsPage        from './pages/trips/Trips';
import DieselPage       from './pages/diesel/Diesel';
import InvoicesPage     from './pages/invoices/Invoices';
import { ReportsPage, ProfitPage } from './pages/reports/Reports';
import { UsersPage, ActivityPage } from './pages/users/Users';
import ContractsPage    from './pages/contracts/Contracts';
import CompaniesPage    from './pages/companies/Companies';
import DriversPage      from './pages/drivers/Drivers';
import PurchasePage     from './pages/purchase/Purchase';
import SalesPage        from './pages/sales/Sales';
import TransactionsPage from './pages/transactions/Transactions';
import SettingsPage     from './pages/settings/Settings';

function ProtectedRoute({ children, requiredPerm, requiredRoles }) {
  const { user, loading, can, isRole } = useAuth();
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:16,background:'var(--clr-bg)',color:'var(--clr-text3)' }}>
      <div className="spinner spinner-lg" /><p>Loading ERP...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (requiredPerm && !can(requiredPerm)) return <Navigate to="/" replace />;
  if (requiredRoles && !isRole(...requiredRoles)) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleSidebar = () => { window.innerWidth < 1024 ? setMobileOpen(o => !o) : setCollapsed(o => !o); };
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="app-layout">
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} />}
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} className={mobileOpen ? 'mobile-open' : ''} />
      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Topbar onMenuClick={toggleSidebar} />
        <main className="page-body">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/sites"         element={<SitesPage />} />
            <Route path="/vehicles"      element={<VehiclesPage />} />
            <Route path="/drivers"       element={<DriversPage />} />
            <Route path="/companies"     element={<CompaniesPage />} />
            <Route path="/products"      element={<ProductsPage />} />
            <Route path="/contracts"     element={<ContractsPage />} />
            <Route path="/purchase"      element={<PurchasePage />} />
            <Route path="/sales"         element={<SalesPage />} />
            <Route path="/trips"         element={<TripsPage />} />
            <Route path="/diesel"        element={<DieselPage />} />
            <Route path="/invoices"      element={<InvoicesPage />} />
            <Route path="/transactions"  element={<TransactionsPage />} />
            <Route path="/reports"       element={<ReportsPage />} />
            <Route path="/settings"      element={<SettingsPage />} />
            <Route path="/profit"        element={<ProtectedRoute requiredPerm="canViewProfit"><ProfitPage /></ProtectedRoute>} />
            <Route path="/users"         element={<ProtectedRoute requiredRoles={['masterAdmin','admin']}><UsersPage /></ProtectedRoute>} />
            <Route path="/activity"      element={<ProtectedRoute requiredRoles={['masterAdmin','admin']}><ActivityPage /></ProtectedRoute>} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:16,background:'var(--clr-bg)',color:'var(--clr-text3)' }}>
      <div className="spinner spinner-lg" />
      <p style={{ fontFamily:'var(--font-display)',fontSize:'1rem' }}>Loading Eliphas ERP...</p>
    </div>
  );
  return (
    <Routes>
      <Route path="/login"            element={<Login />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/fy-select" element={user ? <FinancialYearProvider><SiteProvider><FYSelectPage /></SiteProvider></FinancialYearProvider> : <Navigate to="/login" replace />} />
      <Route path="/*" element={user ? <FinancialYearProvider><SiteProvider><AppLayout /></SiteProvider></FinancialYearProvider> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
