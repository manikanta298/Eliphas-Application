import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import './Dashboard.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#1a3c8f','#2563eb','#f59e0b','#16a34a','#dc2626','#7c3aed'];

const fmt = (n) => {
  if (!n && n !== 0) return '₹0';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(2)} L`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #dde3f0', borderRadius:8, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.10)', fontSize:'0.82rem' }}>
      <p style={{ color:'#64748b', marginBottom:4, fontWeight:600 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, margin:'2px 0', fontWeight:600 }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { can } = useAuth();
  const { financialYears, selectedFY, changeFY } = useFY();
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [sites, setSites]           = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [siteFilter, setSiteFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/sites'),
      api.get('/companies', { params: { type: 'customer' } }),
    ]).then(([s, c]) => {
      setSites(s.data.data || []);
      setCompanies(c.data.data || []);
    }).catch(() => {});
  }, []);

  const fetchStats = () => {
    if (!selectedFY) return;
    setLoading(true);
    api.get('/dashboard/stats', { params: { financialYear: selectedFY.label, site: siteFilter, company: companyFilter } })
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, [selectedFY, siteFilter, companyFilter]);

  const monthlyData = (stats?.charts?.monthly || []).map(m => ({
    name: MONTHS[(m._id.month - 1)] || '',
    Sales: m.revenue || 0,
    Collected: m.collected || 0,
  }));

  const siteData = (stats?.charts?.siteRevenue || [])
    .filter(s => s.revenue > 0)
    .map(s => ({ name: s.siteName || 'Site', value: s.revenue }));

  if (loading && !stats) return (
    <div className="dashboard-loading">
      <div className="spinner spinner-lg" />
      <p style={{ color: 'var(--clr-primary)', fontWeight: 600 }}>
        Loading Dashboard — FY {selectedFY?.label}...
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--clr-text3)' }}>
        First load may take ~30s (server waking up)
      </p>
    </div>
  );

  return (
    <div className="dashboard animate-fade">

      {/* ── Filter Bar ── */}
      <div className="dash-filter-bar">
        <div className="dash-filter-group">
          <span className="dash-filter-label">FY</span>
          <select className="dash-filter-select" value={selectedFY?.label || ''} onChange={e => changeFY(e.target.value)}>
            {financialYears.map(fy => <option key={fy._id} value={fy.label}>{fy.label}{fy.isCurrent ? ' ★' : ''}</option>)}
          </select>
        </div>
        <div className="dash-filter-sep" />
        <div className="dash-filter-group">
          <span className="dash-filter-label">Site</span>
          <select className="dash-filter-select" value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="dash-filter-sep" />
        <div className="dash-filter-group">
          <span className="dash-filter-label">Company</span>
          <select className="dash-filter-select" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        {(siteFilter || companyFilter) && (
          <button className="dash-filter-clear" onClick={() => { setSiteFilter(''); setCompanyFilter(''); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Row 1: Master counts ── */}
      <div className="dash-stat-row">
        {[
          { label: 'Total Sites',    value: stats?.masterStats?.totalSites    ?? 0, icon: '🗺️', color: '#1a3c8f', bg: '#eef2ff' },
          { label: 'Total Vehicles', value: stats?.masterStats?.totalVehicles ?? 0, icon: '🚛', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Total Drivers',  value: stats?.masterStats?.totalDrivers  ?? 0, icon: '👨‍✈️', color: '#0891b2', bg: '#ecfeff' },
          { label: 'Total Invoices', value: stats?.masterStats?.totalInvoices ?? 0, icon: '🧾', color: '#d97706', bg: '#fffbeb' },
        ].map((c, i) => (
          <div key={i} className="dash-count-card" style={{ '--cc': c.color, '--cb': c.bg }}>
            <div className="dash-count-icon">{c.icon}</div>
            <div className="dash-count-value">{c.value}</div>
            <div className="dash-count-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Financial stats (This Month) ── */}
      <div className="dash-stat-row">
        {[
          { label: 'Sales',     sub: 'This Month', value: fmt(stats?.sales?.current),   icon: '💰', color: '#1a3c8f', bg: '#eef2ff' },
          { label: 'Purchase',  sub: 'This Month', value: fmt(stats?.purchase?.total),  icon: '🛒', color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Invoices',  sub: 'This Month', value: stats?.sales?.invoiceCount ?? 0, icon: '🧾', color: '#d97706', bg: '#fffbeb', noRupee: true },
          ...(can('canViewProfit')
            ? [{ label: 'Profit', sub: 'This Month', value: fmt(stats?.profit?.net), icon: '📈', color: '#dc2626', bg: '#fef2f2' }]
            : [{ label: 'Pending', sub: 'Overdue', value: fmt(stats?.pending?.amount), icon: '⏳', color: '#dc2626', bg: '#fef2f2' }]
          ),
        ].map((c, i) => (
          <div key={i} className="dash-fin-card" style={{ '--cc': c.color, '--cb': c.bg }}>
            <div className="dash-fin-top">
              <span className="dash-fin-label">{c.label}</span>
              <span className="dash-fin-icon">{c.icon}</span>
            </div>
            <div className="dash-fin-value">{c.value}</div>
            <div className="dash-fin-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="dash-charts-row">
        {/* Line Chart */}
        <div className="card dash-chart-main">
          <div className="card-header">
            <span className="card-title">Sales Overview (This Month)</span>
            <span className="badge badge-primary">{selectedFY?.label}</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top:5, right:10, bottom:0, left:0 }}>
                <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Sales"     stroke="#1a3c8f" strokeWidth={2.5} dot={{ r:3, fill:'#1a3c8f' }} activeDot={{ r:5 }} name="Sales" />
                <Line type="monotone" dataKey="Collected" stroke="#16a34a" strokeWidth={2.5} dot={{ r:3, fill:'#16a34a' }} activeDot={{ r:5 }} name="Collected" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height:220 }}>
              <div style={{ fontSize:'2.5rem' }}>📊</div>
              <p>No data for {selectedFY?.label}</p>
            </div>
          )}
        </div>

        {/* Pie Chart — Top Sites */}
        <div className="card dash-chart-side">
          <div className="card-header">
            <span className="card-title">Top Sites</span>
          </div>
          {siteData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={siteData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                    {siteData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize:'0.75rem', color:'#64748b' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="site-legend">
                {siteData.map((s, i) => (
                  <div key={i} className="site-legend-item">
                    <div className="site-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="site-legend-name">{s.name} Site</span>
                    <span className="site-legend-val">{fmt(s.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><div style={{ fontSize:'2rem' }}>🗺️</div><p>No site data</p></div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Quick Actions</span>
          <span className="badge badge-gray">FY {selectedFY?.label}</span>
        </div>
        <div className="quick-actions-grid">
          {[
            { icon:'💼', label:'Sales Entry',     path:'/sales',        color:'#1a3c8f' },
            { icon:'🛒', label:'Purchase Entry',  path:'/purchase',     color:'#16a34a' },
            { icon:'🔄', label:'Add Trip',        path:'/trips',        color:'#2563eb' },
            { icon:'⛽', label:'Diesel Entry',    path:'/diesel',       color:'#dc2626' },
            { icon:'🧾', label:'New Invoice',     path:'/invoices',     color:'#d97706' },
            { icon:'💳', label:'Add Payment',     path:'/transactions', color:'#7c3aed' },
            { icon:'🏢', label:'Add Company',     path:'/companies',    color:'#0891b2' },
            { icon:'📊', label:'View Reports',    path:'/reports',      color:'#64748b' },
          ].map((a, i) => (
            <a key={i} href={a.path} className="quick-action-btn" style={{ '--qa-color': a.color }}>
              <span className="quick-action-icon" style={{ background: a.color + '12' }}>{a.icon}</span>
              <span className="quick-action-label">{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
