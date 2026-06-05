import './Reports.css';
import { useState } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDate, formatNumber } from '../../utils/helpers';
import { useFY } from '../../contexts/FinancialYearContext';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';

function downloadCSV(data, filename) {
  if (!data.length) { alert('No data to download'); return; }
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(','),
    ...data.map(row => keys.map(k => `"${(row[k] ?? '').toString().replace(/"/g,'""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const REPORT_TYPES = [
  { key: 'trips',        label: '🔄 Transport',  desc: 'Trip-wise revenue, quantity, routes' },
  { key: 'diesel',       label: '⛽ Diesel',      desc: 'Vehicle diesel consumption & cost' },
  { key: 'invoices',     label: '🧾 Invoices',    desc: 'Invoice status, payments, outstanding' },
  { key: 'advances',     label: '💳 Advances',    desc: 'Advance given, received, adjustments' },
  { key: 'vehicles',     label: '🚛 Vehicles',    desc: 'Vehicle usage and trips summary' },
  { key: 'companies',    label: '🏢 Companies',   desc: 'Company-wise transaction summary' },
];

export function ReportsPage() {
  const { selectedFY } = useFY();
  const { sites, selectedSite } = useSite();
  const { can } = useAuth();

  const [reportType, setType] = useState('trips');
  const [filters, setFilters] = useState({ site: '', startDate: '', endDate: '' });
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [generated, setGenerated] = useState(false);
  const [resultSearch, setResultSearch] = useState('');

  const siteFilter = filters.site || selectedSite?._id;

  // Compute numeric totals for summary row
  const computeTotals = (rows) => {
    if (!rows.length) return null;
    const keys = Object.keys(rows[0]);
    const totals = {};
    keys.forEach(k => {
      const vals = rows.map(r => Number(r[k])).filter(v => !isNaN(v) && v !== 0);
      if (vals.length > 0) totals[k] = vals.reduce((a, b) => a + b, 0);
      else totals[k] = null;
    });
    return totals;
  };

  const generateReport = async () => {
    setLoading(true); setGenerated(false); setResultSearch('');
    try {
      const params = { financialYear: selectedFY?.label, site: siteFilter, ...filters };
      let url = `/reports/${reportType}`;
      if (reportType === 'advances') url = '/reports/advances';
      const res = await api.get(url, { params });
      setData(res.data.data || []);
      setGenerated(true);
    } catch (e) {
      // Fallback: construct from relevant endpoints
      try {
        let fallback = [];
        if (reportType === 'trips') {
          const r = await api.get('/trips', { params: { financialYear: selectedFY?.label, site: siteFilter, limit: 500 } });
          fallback = (r.data.data || []).map(t => ({
            'Trip #': t.tripNumber, 'Date': formatDate(t.tripDate),
            'Vehicle': t.vehicleNumber || t.vehicle?.vehicleNumber,
            'Driver': t.driverName,
            'Billing': t.billingType === 'ton' ? 'Ton' : 'Fixed',
            'Qty': t.quantity || '',
            'Rate': t.rateApplied,
            'Amount': t.baseAmount,
            'From': t.loadingPoint, 'To': t.unloadingPoint,
          }));
        } else if (reportType === 'diesel') {
          const r = await api.get('/diesel', { params: { financialYear: selectedFY?.label, site: siteFilter, limit: 500 } });
          fallback = (r.data.data || []).map(e => ({
            'Date': formatDate(e.entryDate),
            'Vehicle': e.vehicle?.vehicleNumber,
            'Driver': e.driverName,
            'Opening': e.openingReading,
            'Present': e.presentReading,
            'Closing': e.closingReading,
            'Rate/L': e.ratePerLiter,
            'Amount': e.totalAmount,
          }));
        } else if (reportType === 'invoices') {
          const r = await api.get('/invoices', { params: { financialYear: selectedFY?.label, site: siteFilter, limit: 500 } });
          fallback = (r.data.data || []).map(inv => ({
            'Invoice #': inv.invoiceNumber,
            'Date': formatDate(inv.invoiceDate),
            'Customer': inv.customer?.name || inv.customer?.company,
            'Total': inv.totalAmount,
            'Paid': inv.paidAmount,
            'Balance': inv.balanceAmount,
            'Status': inv.paymentStatus,
          }));
        } else if (reportType === 'advances') {
          const r = await api.get('/transactions', { params: { financialYear: selectedFY?.label, site: siteFilter, limit: 500 } });
          fallback = (r.data.data || []).map(t => ({
            'Txn #': t.transactionNumber,
            'Date': formatDate(t.date),
            'Type': t.type,
            'Party': t.partyName || t.party?.name,
            'Category': t.category,
            'Amount': t.amount,
            'Description': t.description,
          }));
        } else if (reportType === 'vehicles') {
          const r = await api.get('/vehicles', { params: { limit: 200 } });
          fallback = (r.data.data || []).map(v => ({
            'Vehicle #': v.vehicleNumber,
            'Type': v.vehicleType,
            'Owner': v.ownerName,
            'Driver': v.driverName,
            'DL': v.driverLicense,
            'Fitness': v.fitnessCertNo,
            'Permit': v.permitNo,
            'Diesel Reading': v.presentDieselReading,
            'Status': v.status,
          }));
        } else if (reportType === 'companies') {
          const r = await api.get('/companies', { params: { limit: 200 } });
          fallback = (r.data.data || []).map(c => ({
            'Name': c.name,
            'Type': c.type,
            'GSTIN': c.gstin,
            'Phone': c.phone,
            'Email': c.email,
            'City': c.city,
          }));
        }
        setData(fallback);
        setGenerated(true);
      } catch (err2) { console.error(err2); }
    }
    finally { setLoading(false); }
  };

  const handleDownload = () => {
    const site = sites.find(s => s._id === siteFilter);
    const fname = `${reportType}-report-${site?.name || 'all'}-${selectedFY?.label || 'all'}.csv`;
    downloadCSV(data, fname);
  };

  const filteredData = resultSearch
    ? data.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(resultSearch.toLowerCase())))
    : data;
  const totals = computeTotals(filteredData);
  const cols = data.length ? Object.keys(data[0]) : [];
  const selectedReport = REPORT_TYPES.find(r => r.key === reportType);
  const siteName = sites.find(s => s._id === siteFilter)?.name || selectedSite?.name || 'All Sites';

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>

      {/* Print-only header */}
      <div className="print-header" style={{ padding:'16px 0 8px', borderBottom:'2px solid #1a3c8f', marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:'1.3rem', color:'#1a3c8f' }}>🐕 Eliphas ERP — {selectedReport?.label} Report</div>
        <div style={{ fontSize:'0.85rem', color:'#64748b', marginTop:4 }}>
          Site: {siteName} &nbsp;|&nbsp; FY: {selectedFY?.label} &nbsp;|&nbsp; Generated: {new Date().toLocaleDateString('en-IN')}
          {filters.startDate && ` | From: ${filters.startDate}`}
          {filters.endDate && ` | To: ${filters.endDate}`}
        </div>
      </div>

      <div className="page-header no-print">
        <div>
          <h2 className="page-title">📊 Reports</h2>
          <p className="page-subtitle">{selectedSite?.name || 'All Sites'} · FY {selectedFY?.label}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={() => window.print()}>🖨️ Print</button>
          {data.length > 0 && (
            <button className="btn btn-primary" onClick={handleDownload}>⬇️ CSV</button>
          )}
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="no-print" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'var(--sp-3)' }}>
        {REPORT_TYPES.map(r => (
          <div key={r.key}
            onClick={() => { setType(r.key); setData([]); setGenerated(false); setResultSearch(''); }}
            style={{
              border: `2px solid ${reportType === r.key ? 'var(--clr-primary)' : '#dde3f0'}`,
              borderRadius:12, padding:'14px', cursor:'pointer', transition:'all 0.15s',
              background: reportType === r.key ? 'var(--clr-primary)' : '#fff',
              color: reportType === r.key ? '#fff' : 'inherit',
            }}>
            <div style={{ fontSize:'1.4rem', marginBottom:4 }}>{r.label.split(' ')[0]}</div>
            <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{r.label.split(' ').slice(1).join(' ')}</div>
            <div style={{ fontSize:'0.72rem', opacity:0.7, marginTop:2 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card no-print" style={{ padding:'var(--sp-4)' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">Site</label>
            <select className="form-control" value={filters.site} onChange={e => setFilters(f => ({ ...f, site: e.target.value }))}>
              <option value="">Current Site ({selectedSite?.name})</option>
              {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              <option value="all">All Sites</option>
            </select>
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">From</label>
            <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">To</label>
            <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <button className="btn btn-outline" onClick={() => setFilters({ site:'', startDate:'', endDate:'' })}>✕ Reset</button>
          <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
            {loading ? '⏳ Loading…' : `Generate ${selectedReport?.label}`}
          </button>
        </div>
      </div>

      {/* Results */}
      {generated && (
        <div className="card">
          {/* Result header */}
          <div className="card-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <span className="card-title">{selectedReport?.label} — {siteName} · {selectedFY?.label}</span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span className="badge badge-primary">{filteredData.length} of {data.length} records</span>
              <input
                className="form-control report-search no-print"
                placeholder="🔍 Search in results..."
                value={resultSearch}
                onChange={e => setResultSearch(e.target.value)}
                style={{ maxWidth:220, fontSize:'0.82rem' }}
              />
              {resultSearch && <button className="btn btn-secondary btn-sm no-print" onClick={() => setResultSearch('')}>✕</button>}
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize:'2.5rem' }}>📊</div>
              <p>{resultSearch ? `No results for "${resultSearch}"` : 'No data for selected filters'}</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="table">
                <thead>
                  <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredData.map((row, i) => (
                    <tr key={i}>{cols.map(c => <td key={c}>{row[c] ?? '—'}</td>)}</tr>
                  ))}
                </tbody>
                {/* Totals row */}
                {totals && (
                  <tfoot>
                    <tr className="totals-row">
                      {cols.map((c, i) => (
                        <td key={c}>
                          {i === 0 ? 'TOTAL' : totals[c] != null
                            ? (typeof filteredData[0][c] === 'number' || !isNaN(filteredData[0][c])
                              ? Number(totals[c]).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                              : '—')
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProfitPage() {
  const { selectedFY } = useFY();
  const { sites, selectedSite } = useSite();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [site, setSite] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await api.get('/dashboard/profit', { params: { financialYear: selectedFY?.label, site: site || selectedSite?._id } });
      setData(r.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
      <div className="page-header">
        <div><h2 className="page-title">💰 Profit Analytics</h2></div>
        <div style={{ display:'flex', gap:8 }}>
          <select className="form-control" value={site} onChange={e => setSite(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={fetch} disabled={loading}>
            {loading ? '⏳' : 'Generate'}
          </button>
        </div>
      </div>
      {data.length > 0 && (
        <div className="card">
          <table className="table">
            <thead><tr><th>Site</th><th>Revenue</th><th>Supplier Cost</th><th>Expenses</th><th>Net Profit</th><th>Trips</th></tr></thead>
            <tbody>
              {data.map((d,i) => (
                <tr key={i}>
                  <td>{d.site?.name || '—'}</td>
                  <td>{formatCurrency(d.totalRevenue)}</td>
                  <td>{formatCurrency(d.totalSupplierCost)}</td>
                  <td>{formatCurrency((d.totalVendorExpense || 0) + (d.totalDieselExpense || 0))}</td>
                  <td><strong style={{ color: d.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(d.netProfit)}</strong></td>
                  <td>{d.trips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
