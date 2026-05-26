import './Reports.css';
// Reports.jsx
import { useState } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDate, formatNumber } from '../../utils/helpers';
import { useFY } from '../../contexts/FinancialYearContext';
import FilterBar from '../../components/common/FilterBar';

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

export function ReportsPage() {
  const { selectedFY } = useFY();
  const [reportType, setType] = useState('trips');
  const [filters, setFilters] = useState({ site:'', startDate:'', endDate:'', type:'monthly' });
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = { ...filters, financialYear: selectedFY?.label };
      const res = await api.get(`/reports/${reportType}`, { params });
      setData(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDownload = () => {
    const fname = `${reportType}-report-${selectedFY?.label || 'all'}-${new Date().toLocaleDateString('en-IN').replace(/\//g,'-')}.csv`;
    downloadCSV(data, fname);
  };

  const handlePrint = () => window.print();

  return (
    <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
      <div className="page-header">
        <div><h2 className="page-title">📊 Reports &amp; Analytics</h2><p className="page-subtitle">Daily, Monthly &amp; Custom Reports — {selectedFY?.label}</p></div>
        <div style={{display:'flex',gap:8}} className="no-print">
          <button className="btn btn-outline" onClick={handlePrint}>🖨️ Print</button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={!data.length}>⬇️ Download CSV</button>
        </div>
      </div>

      <FilterBar showSite showCompany onChange={({ site }) => setFilters(f => ({ ...f, site: site || '' }))} />

      <div className="card no-print">
        <div className="card-header"><span className="card-title">Report Configuration</span></div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Report Type</label>
            <select className="form-control" value={reportType} onChange={e=>{setType(e.target.value);setData([]);}}>
              <option value="trips">Trip Report</option>
              <option value="diesel">Diesel Report</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Start Date</label>
            <input type="date" className="form-control" value={filters.startDate} onChange={e=>setFilters({...filters,startDate:e.target.value})} />
          </div>
          <div className="form-group"><label className="form-label">End Date</label>
            <input type="date" className="form-control" value={filters.endDate} onChange={e=>setFilters({...filters,endDate:e.target.value})} />
          </div>
          <div className="form-group" style={{justifyContent:'flex-end',justifyItems:'flex-end',paddingTop:'20px'}}>
            <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
              {loading ? <><span className="spinner"/> Generating...</> : '📊 Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {data.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{reportType === 'trips' ? 'Trip Report' : 'Diesel Report'} — {data.length} records</span>
          </div>
          {reportType === 'trips' ? (
            <div className="table-wrap">
              <table className="erp-table">
                <thead><tr><th>Trip #</th><th>Date</th><th>Site</th><th>Vehicle</th><th>Product</th><th>Qty</th><th>Billing</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {data.map(t=>(
                    <tr key={t._id}>
                      <td style={{color:'var(--clr-accent)',fontFamily:'var(--font-display)',fontSize:'0.8rem'}}>{t.tripNumber}</td>
                      <td>{formatDate(t.tripDate)}</td>
                      <td>{t.site?.name}</td>
                      <td>{t.vehicle?.vehicleNumber}</td>
                      <td>{t.product?.name}</td>
                      <td>{formatNumber(t.quantity,1)}</td>
                      <td>{t.billingType}</td>
                      <td><strong>{formatCurrency(t.baseAmount)}</strong></td>
                      <td>{t.status}</td>
                    </tr>
                  ))}
                  <tr style={{background:'var(--clr-accent-dim)',fontWeight:700}}>
                    <td colSpan={7} style={{textAlign:'right',color:'var(--clr-text)'}}>TOTAL:</td>
                    <td><strong style={{color:'var(--clr-accent)'}}>{formatCurrency(data.reduce((s,t)=>s+(t.baseAmount||0),0))}</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="erp-table">
                <thead><tr><th>Date</th><th>Vehicle</th><th>Site</th><th>Shift</th><th>Liters</th><th>Rate/L</th><th>Amount</th></tr></thead>
                <tbody>
                  {data.map(d=>(
                    <tr key={d._id}>
                      <td>{formatDate(d.entryDate)}</td>
                      <td>{d.vehicle?.vehicleNumber}</td>
                      <td>{d.site?.name}</td>
                      <td>{d.shift}</td>
                      <td>{formatNumber(d.liters,1)} L</td>
                      <td>₹{d.ratePerLiter}</td>
                      <td><strong>{formatCurrency(d.totalAmount)}</strong></td>
                    </tr>
                  ))}
                  <tr style={{background:'var(--clr-accent-dim)',fontWeight:700}}>
                    <td colSpan={4} style={{textAlign:'right',color:'var(--clr-text)'}}>TOTAL:</td>
                    <td><strong>{formatNumber(data.reduce((s,d)=>s+(d.liters||0),0),1)} L</strong></td>
                    <td></td>
                    <td><strong style={{color:'var(--clr-accent)'}}>{formatCurrency(data.reduce((s,d)=>s+(d.totalAmount||0),0))}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ProfitPage.jsx
export function ProfitPage() {
  const [data, setData]     = useState([]);
  const [sites, setSites]   = useState([]);
  const [filters, setFilters] = useState({ site:'', startDate:'', endDate:'' });
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await api.get('/dashboard/profit', { params: filters });
      setData(r.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useState(() => {
    api.get('/sites').then(r=>setSites(r.data.data));
    fetch();
  }, []);

  const totals = data.reduce((acc,d) => ({
    revenue: acc.revenue + d.totalRevenue,
    supplierCost: acc.supplierCost + d.totalSupplierCost,
    vendorExpense: acc.vendorExpense + d.totalVendorExpense,
    dieselExpense: acc.dieselExpense + d.totalDieselExpense,
    netProfit: acc.netProfit + d.netProfit,
  }), { revenue:0, supplierCost:0, vendorExpense:0, dieselExpense:0, netProfit:0 });

  return (
    <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
      <div className="page-header">
        <div><h2 className="page-title">💰 Profit Analytics</h2><p className="page-subtitle">Internal profit report — Admin access only</p></div>
        <button className="btn btn-primary" onClick={fetch} disabled={loading}>{loading?'Loading...':'🔄 Refresh'}</button>
      </div>

      {/* Summary Cards */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'var(--sp-4)'}}>
        {[
          {label:'Total Revenue',value:totals.revenue,color:'var(--clr-accent)',icon:'💰'},
          {label:'Supplier Cost',value:totals.supplierCost,color:'var(--clr-danger)',icon:'📤'},
          {label:'Vendor Expenses',value:totals.vendorExpense,color:'var(--clr-warning)',icon:'🚛'},
          {label:'Diesel Expenses',value:totals.dieselExpense,color:'var(--clr-info)',icon:'⛽'},
          {label:'Net Profit',value:totals.netProfit,color:totals.netProfit>=0?'var(--clr-success)':'var(--clr-danger)',icon:'📈'},
        ].map((c,i)=>(
          <div key={i} className="stat-card" style={{flex:'1 1 160px','--card-color':c.color}}>
            <div className="stat-card-icon" style={{background:`${c.color}18`,fontSize:'20px'}}>{c.icon}</div>
            <div className="stat-card-label">{c.label}</div>
            <div className="stat-card-value" style={{color:c.color,fontSize:'1.35rem'}}>{formatCurrency(c.value)}</div>
          </div>
        ))}
      </div>

      {/* Site-wise breakdown */}
      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr><th>Site</th><th>Trips</th><th>Revenue</th><th>Supplier Cost</th><th>Vendor Exp.</th><th>Diesel Exp.</th><th>Net Profit</th><th>Margin %</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{textAlign:'center',padding:'40px'}}><div className="spinner" style={{margin:'auto'}}/></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">💰</div><p>No profit data</p></div></td></tr>
            ) : data.map((d,i) => {
              const margin = d.totalRevenue > 0 ? ((d.netProfit/d.totalRevenue)*100).toFixed(1) : 0;
              return (
                <tr key={i}>
                  <td><strong>{d.site?.name||'Unknown'}</strong></td>
                  <td>{d.trips}</td>
                  <td><strong>{formatCurrency(d.totalRevenue)}</strong></td>
                  <td style={{color:'var(--clr-danger)'}}>{formatCurrency(d.totalSupplierCost)}</td>
                  <td style={{color:'var(--clr-warning)'}}>{formatCurrency(d.totalVendorExpense)}</td>
                  <td style={{color:'var(--clr-info)'}}>{formatCurrency(d.totalDieselExpense)}</td>
                  <td><strong style={{color:d.netProfit>=0?'var(--clr-success)':'var(--clr-danger)'}}>{formatCurrency(d.netProfit)}</strong></td>
                  <td><span style={{color:margin>=15?'var(--clr-success)':margin>=5?'var(--clr-warning)':'var(--clr-danger)',fontWeight:700}}>{margin}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
