import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import './Dashboard.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#3b82f6','#f5a623','#22c55e','#a855f7','#ef4444','#06b6d4'];

const fmt = (n) => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(2)} L`;
  return `₹${Number(n).toLocaleString('en-IN')}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e2235', border: '1px solid #2d3748', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { can } = useAuth();
  const { financialYears, selectedFY, changeFY } = useFY();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [companies, setCompanies] = useState([]);
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
    const params = { financialYear: selectedFY.label };
    if (siteFilter) params.site = siteFilter;
    if (companyFilter) params.company = companyFilter;
    api.get('/dashboard/stats', { params })
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, [selectedFY, siteFilter, companyFilter]);

  const monthlyData = stats?.charts?.monthly?.map(m => ({
    name: MONTHS[(m._id.month - 1)],
    Revenue: m.revenue || 0,
    Collected: m.collected || 0,
  })) || [];

  const siteData = stats?.charts?.siteRevenue?.filter(s => s.revenue > 0)
    .map(s => ({ name: s.siteName || 'Site', value: s.revenue })) || [];

  if (loading && !stats) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:16,color:'var(--clr-text3)' }}>
      <div className="spinner spinner-lg" />
      <p>Loading Dashboard — FY {selectedFY?.label}...</p>
    </div>
  );

  return (
    <div className="dashboard animate-fade">

      {/* ── Top Filter Bar (FY + Site + Company) ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
        background:'var(--clr-surface)', border:'1px solid var(--clr-border)',
        borderRadius:12, padding:'10px 18px', marginBottom:20,
      }}>
        <span style={{ color:'var(--clr-text3)', fontSize:'0.78rem' }}>📅 Financial Year</span>
        <select value={selectedFY?.label || ''} onChange={e => changeFY(e.target.value)}
          style={{ padding:'5px 12px', borderRadius:20, border:'1px solid var(--clr-primary)', background:'var(--clr-primary)11', color:'var(--clr-primary)', fontWeight:700, fontSize:'0.82rem', cursor:'pointer' }}>
          {financialYears.map(fy => (
            <option key={fy._id} value={fy.label}>{fy.label}{fy.isCurrent ? ' ★' : ''}</option>
          ))}
        </select>

        <span style={{ color:'var(--clr-border)' }}>|</span>
        <span style={{ color:'var(--clr-text3)', fontSize:'0.78rem' }}>🗺 Site</span>
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}
          style={{ padding:'5px 12px', borderRadius:20, border:'1px solid var(--clr-border)', background:'var(--clr-bg)', color:'var(--clr-text)', fontSize:'0.82rem' }}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>

        <span style={{ color:'var(--clr-border)' }}>|</span>
        <span style={{ color:'var(--clr-text3)', fontSize:'0.78rem' }}>🏢 Company</span>
        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
          style={{ padding:'5px 12px', borderRadius:20, border:'1px solid var(--clr-border)', background:'var(--clr-bg)', color:'var(--clr-text)', fontSize:'0.82rem' }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>

        {(siteFilter || companyFilter) && (
          <button onClick={() => { setSiteFilter(''); setCompanyFilter(''); }}
            style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:6, border:'1px solid var(--clr-border)', background:'transparent', color:'var(--clr-text3)', cursor:'pointer', fontSize:'0.75rem' }}>
            Clear ✕
          </button>
        )}
      </div>

      {/* ── Master Stat Cards (row 1) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:14 }}>
        {[
          { icon:'🗺', label:'Total Sites',    value: stats?.masterStats?.totalSites    ?? '—', color:'#3b82f6' },
          { icon:'🚛', label:'Total Vehicles', value: stats?.masterStats?.totalVehicles ?? '—', color:'#a855f7' },
          { icon:'👨‍✈️', label:'Total Drivers',  value: stats?.masterStats?.totalDrivers  ?? '—', color:'#f59e0b' },
          { icon:'🧾', label:'Total Invoices', value: stats?.masterStats?.totalInvoices ?? '—', color:'#06b6d4' },
        ].map((c,i) => (
          <div key={i} className="stat-card" style={{ '--card-color': c.color }}>
            <div className="stat-card-icon" style={{ background: `${c.color}18`, fontSize:'1.4rem' }}>{c.icon}</div>
            <div className="stat-card-label">{c.label}</div>
            <div className="stat-card-value" style={{ color: c.color, fontSize:'2rem' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Financial Stat Cards (row 2) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          { icon:'🛒', label:'Purchase',      value: fmt(stats?.purchase?.total),  sub: `${stats?.purchase?.count || 0} entries`, color:'#f59e0b' },
          { icon:'💰', label:'Sales',         value: fmt(stats?.sales?.current),   sub: `${stats?.sales?.invoiceCount || 0} invoices`, color:'#22c55e' },
          ...(can('canViewProfit') ? [{ icon:'📈', label:'Profit', value: fmt(stats?.profit?.net), sub: 'Net after expenses', color:'#3b82f6' }] : [
            { icon:'⏳', label:'Pending',     value: fmt(stats?.pending?.amount),  sub: `${stats?.pending?.count || 0} invoices due`, color:'#ef4444' },
          ]),
          { icon:'⛽', label:'Diesel Cost',   value: fmt(stats?.diesel?.amount),   sub: `${(stats?.diesel?.liters||0).toFixed(0)} Liters`, color:'#ef4444' },
        ].map((c,i) => (
          <div key={i} className="stat-card" style={{ '--card-color': c.color }}>
            <div className="stat-card-icon" style={{ background: `${c.color}18`, fontSize:'1.4rem' }}>{c.icon}</div>
            <div className="stat-card-label">{c.label}</div>
            <div className="stat-card-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-card-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:20 }}>
        {/* Area Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Sales Overview</span>
            <span className="badge badge-accent">{selectedFY?.label}</span>
          </div>
          {monthlyData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top:5, right:10, bottom:0, left:10 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f5a623" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill:'#6b7494', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#6b7494', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Revenue"   stroke="#f5a623" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Collected" stroke="#22c55e" fill="url(#colGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><div style={{ fontSize:'2rem' }}>📊</div><p>No data for {selectedFY?.label}</p></div>
          )}
        </div>

        {/* Pie — Top Sites */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Sites</span>
          </div>
          {siteData.length ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={siteData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {siteData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:6 }}>
                {siteData.map((s,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'0.78rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ color:'var(--clr-text2)' }}>{s.name}</span>
                    </div>
                    <span style={{ fontWeight:600 }}>{fmt(s.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><div style={{ fontSize:'2rem' }}>🗺</div><p>No site data</p></div>
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
            { icon:'🛒', label:'Purchase Entry',  path:'/purchase?action=add', color:'#f59e0b' },
            { icon:'💼', label:'Sales Entry',      path:'/sales?action=add',   color:'#22c55e' },
            { icon:'🔄', label:'Add Trip',         path:'/trips?action=add',   color:'#3b82f6' },
            { icon:'⛽', label:'Diesel Entry',     path:'/diesel?action=add',  color:'#ef4444' },
            { icon:'🧾', label:'New Invoice',      path:'/invoices',           color:'#f5a623' },
            { icon:'💳', label:'Add Transaction',  path:'/transactions',       color:'#a855f7' },
            { icon:'🏢', label:'Add Company',      path:'/companies',          color:'#06b6d4' },
            { icon:'📊', label:'View Reports',     path:'/reports',            color:'#6b7280' },
          ].map((a,i) => (
            <a key={i} href={a.path} className="quick-action-btn" style={{ '--qa-color': a.color }}>
              <span className="quick-action-icon">{a.icon}</span>
              <span className="quick-action-label">{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
