import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import { useSite } from '../../contexts/SiteContext';
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
  const { selectedSite } = useSite();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedFY) return;
    setLoading(true);
    const params = { financialYear: selectedFY.label };
    if (selectedSite?._id) params.site = selectedSite._id;
    api.get('/dashboard/stats', { params })
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedFY, selectedSite]);

  const monthlyData = (stats?.charts?.monthly || []).map(m => ({
    name: MONTHS[(m._id.month - 1)] || '',
    Revenue: m.revenue || 0,
    Collected: m.collected || 0,
  }));

  const siteData = (stats?.charts?.siteRevenue || [])
    .filter(s => s.revenue > 0)
    .map(s => ({ name: s.siteName || 'Site', value: s.revenue }));

  if (loading && !stats) return (
    <div className="dashboard-loading">
      <div className="spinner spinner-lg" />
      <p style={{ color: 'var(--clr-primary)', fontWeight: 600 }}>
        Loading — {selectedSite?.name || 'All Sites'} · FY {selectedFY?.label}
      </p>
    </div>
  );

  return (
    <div className="dashboard animate-fade">

      {/* ── Site + FY Header ── */}
      <div className="dash-filter-bar">
        <div className="dash-filter-group">
          <span className="dash-filter-label">FY</span>
          <select className="dash-filter-select" value={selectedFY?.label || ''} onChange={e => changeFY(e.target.value)}>
            {financialYears.map(fy => <option key={fy._id} value={fy.label}>{fy.label}{fy.isCurrent ? ' ★' : ''}</option>)}
          </select>
        </div>
        <div className="dash-filter-sep" />
        <div className="dash-filter-group">
          <span className="dash-filter-label" style={{ color:'#16a34a' }}>🗺️</span>
          <span style={{ color:'#16a34a', fontWeight:700, fontSize:'0.88rem' }}>
            {selectedSite?.name || 'No site selected'}
          </span>
          {selectedSite?.clientCompany && (
            <span style={{ color:'#64748b', fontSize:'0.78rem', marginLeft:4 }}>— {selectedSite.clientCompany}</span>
          )}
        </div>
      </div>

      {/* ── Row 1: Master counts ── */}
      <div className="dash-stat-row">
        {[
          { label: 'Total Trips',    value: stats?.trips?.count       ?? 0, icon: '🔄', color: '#1a3c8f', bg: '#eef2ff' },
          { label: 'Vehicles',       value: stats?.vehicles?.active   ?? 0, icon: '🚛', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Revenue',        value: fmt(stats?.trips?.revenue), icon: '💰', color: '#16a34a', bg: '#f0fdf4', isAmt: true },
          { label: 'Diesel Cost',    value: fmt(stats?.diesel?.amount), icon: '⛽', color: '#dc2626', bg: '#fef2f2', isAmt: true },
        ].map((c, i) => (
          <div key={i} className="dash-count-card" style={{ '--cc': c.color, '--cb': c.bg }}>
            <div className="dash-count-icon">{c.icon}</div>
            <div className="dash-count-value">{c.value}</div>
            <div className="dash-count-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Financial stats ── */}
      <div className="dash-stat-row">
        {[
          { label: 'Invoiced',     sub: 'This FY',   value: fmt(stats?.sales?.current),    icon: '🧾', color: '#1a3c8f', bg: '#eef2ff' },
          { label: 'Collected',    sub: 'This FY',   value: fmt(stats?.sales?.paid),        icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Outstanding',  sub: 'Pending',   value: fmt(stats?.pending?.amount),    icon: '⏳', color: '#d97706', bg: '#fffbeb' },
          ...(can('canViewProfit')
            ? [{ label: 'Net Profit', sub: 'This FY', value: fmt(stats?.profit?.net), icon: '📈', color: '#dc2626', bg: '#fef2f2' }]
            : [{ label: 'Invoices',   sub: 'Count',   value: stats?.sales?.invoiceCount ?? 0, icon: '📄', color: '#0891b2', bg: '#ecfeff' }]
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
        <div className="card dash-chart-main">
          <div className="card-header">
            <span className="card-title">Revenue Overview — {selectedSite?.name || 'All Sites'}</span>
            <span className="badge badge-primary">{selectedFY?.label}</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top:5, right:10, bottom:0, left:0 }}>
                <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Revenue"   stroke="#1a3c8f" strokeWidth={2.5} dot={{ r:3 }} activeDot={{ r:5 }} />
                <Line type="monotone" dataKey="Collected" stroke="#16a34a" strokeWidth={2.5} dot={{ r:3 }} activeDot={{ r:5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height:220 }}>
              <div style={{ fontSize:'2.5rem' }}>📊</div>
              <p>No data for {selectedFY?.label}</p>
            </div>
          )}
        </div>

        <div className="card dash-chart-side">
          <div className="card-header"><span className="card-title">Site Revenue</span></div>
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
                    <span className="site-legend-name">{s.name}</span>
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
          <span className="badge badge-gray">{selectedSite?.name} · {selectedFY?.label}</span>
        </div>
        <div className="quick-actions-grid">
          {[
            { icon:'🔄', label:'Add Trip',        path:'/trips',        color:'#2563eb' },
            { icon:'⛽', label:'Diesel Entry',    path:'/diesel',       color:'#dc2626' },
            { icon:'🧾', label:'New Invoice',     path:'/invoices',     color:'#d97706' },
            { icon:'💳', label:'Add Advance',     path:'/transactions', color:'#7c3aed' },
            { icon:'🏢', label:'Companies',       path:'/companies',    color:'#0891b2' },
            { icon:'🚛', label:'Vehicles',        path:'/vehicles',     color:'#7c3aed' },
            { icon:'🗺️', label:'Sites',           path:'/sites',        color:'#16a34a' },
            { icon:'📊', label:'Reports',         path:'/reports',      color:'#64748b' },
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
