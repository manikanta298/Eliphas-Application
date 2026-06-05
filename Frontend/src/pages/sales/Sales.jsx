import './Sales.css';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import { useSite } from '../../contexts/SiteContext';
import FilterBar from '../../components/common/FilterBar';
import ComboInput from '../../components/common/ComboInput';

const BILLING_TYPES = ['trip','ton','kg','unit','hour','day','fixed'];

const EMPTY_FORM = {
  customer: '', customerName: '',
  site: '', saleDate: new Date().toISOString().slice(0,10),
  items: [{ description: '', billingType: 'ton', quantity: 0, weight: 0, unit: 'Ton', basePrice: 0, amount: 0 }],
  gstPercent: 18, tdsPercent: 2,
  transportCharges: 0, dieselCharges: 0,
  otherDeductions: 0, paidAmount: 0,
  notes: '',
};

function calcItem(item) {
  const qty   = Number(item.quantity) || 0;
  const wt    = Number(item.weight)   || 0;
  const price = Number(item.basePrice) || 0;
  let amt = 0;
  if (item.billingType === 'ton') amt = (wt / 1000) * price;
  else if (item.billingType === 'kg') amt = wt * price;
  else amt = qty * price;
  return { ...item, amount: Math.round(amt * 100) / 100 };
}

function calcTotals(form) {
  const subtotal = form.items.reduce((s,i) => s + (Number(i.amount)||0), 0);
  const gstAmt   = subtotal * (Number(form.gstPercent) / 100);
  const tdsAmt   = subtotal * (Number(form.tdsPercent) / 100);
  const total    = subtotal + gstAmt - tdsAmt
    + Number(form.transportCharges||0)
    + Number(form.dieselCharges||0)
    - Number(form.otherDeductions||0);
  return { subtotal, gstAmt, tdsAmt, totalAmount: Math.round(total*100)/100 };
}

export default function SalesPage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const { selectedSite } = useSite();
  const siteId = selectedSite?._id || '';
  const [sales, setSales]         = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sites, setSites]         = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState({ site: '', status: '' });
  const [search, setSearch]       = useState('');
  const [viewInvoice, setViewInvoice] = useState(null);

  const { subtotal, gstAmt, tdsAmt, totalAmount } = calcTotals(form);

  const updateItem = (idx, field, val) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = calcItem({ ...items[idx], [field]: val });
      return { ...f, items };
    });
  };
  const addItem = () => setForm(f => ({
    ...f,
    items: [...f.items, { description:'', billingType:'ton', quantity:0, weight:0, unit:'Ton', basePrice:0, amount:0 }],
  }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_,i) => i !== idx) }));

  const fetchSales = () => {
    setLoading(true);
    const params = { type: 'customer', financialYear: selectedFY?.label };
    params.site = filter.site || siteId || undefined;
    if (filter.status) params.paymentStatus = filter.status;
    api.get('/invoices', { params })
      .then(r => setSales(r.data.data || []))
      .catch(e => setError(e.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get('/companies', { params: { type: 'customer' } }),
      api.get('/sites'),
      api.get('/products'),
    ]).then(([c, s, p]) => {
      setCustomers(c.data.data || []);
      setSites(s.data.data || []);
      setProducts(p.data.data || []);
    });
  }, []);

  useEffect(() => { if (selectedFY) fetchSales(); }, [selectedFY, filter, siteId]);

  const handleCustomerSelect = (cid) => {
    const cust = customers.find(c => c._id === cid);
    setForm(f => ({ ...f, customer: cid, customerName: cust?.name || '', tdsPercent: cust?.tdsPercent || 2 }));
  };

  const handleSave = async () => {
    if (!form.customerName || !form.site) { setError('Customer and Site are required'); return; }
    if (!form.items.length) { setError('Add at least one item'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        invoiceType: 'customer',
        financialYear: selectedFY?.label,
        customer: form.customer || undefined,
        customerName: form.customerName,
        site: form.site,
        invoiceDate: form.saleDate || new Date(),
        items: form.items.map(i => ({ ...i, amount: Number(i.amount) })),
        subtotal,
        gstPercent: Number(form.gstPercent),
        gstAmount: gstAmt,
        tdsPercent: Number(form.tdsPercent),
        tdsAmount: tdsAmt,
        transportCharges: Number(form.transportCharges)||0,
        dieselCharges: Number(form.dieselCharges)||0,
        otherDeductions: Number(form.otherDeductions)||0,
        totalAmount,
        notes: form.notes,
      };
      await api.post('/invoices', payload);
      setModal(false); setForm(EMPTY_FORM); fetchSales();
    } catch(e) { setError(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleReset = () => { setForm(EMPTY_FORM); setError(''); };

  const handlePrint = (inv) => {
    const w = window.open('', '_blank');
    w.document.write(buildInvoiceHTML(inv));
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 600);
  };

  const buildInvoiceHTML = (inv) => `
<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title>
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#222;}
  .header{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:16px;margin-bottom:20px;}
  .company{font-size:22px;font-weight:900;color:#1d4ed8;}
  .inv-meta{display:flex;justify-content:space-between;margin-bottom:18px;}
  .meta-box{font-size:13px;}
  .meta-box .label{color:#666;font-size:11px;text-transform:uppercase;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  th{background:#1d4ed8;color:#fff;padding:8px 10px;font-size:12px;text-align:left;}
  td{padding:8px 10px;font-size:13px;border-bottom:1px solid #eee;}
  .totals{float:right;width:280px;}
  .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #eee;}
  .total-row.net{font-weight:900;font-size:15px;color:#1d4ed8;border-top:2px solid #1d4ed8;padding-top:8px;}
  .footer{text-align:center;margin-top:40px;font-size:12px;color:#888;}
  @media print{button{display:none}}
</style></head><body>
<div class="header">
  <div class="company">LOGICORE ERP</div>
  <div style="font-size:13px;color:#666;">Tax Invoice</div>
</div>
<div class="inv-meta">
  <div class="meta-box">
    <div class="label">Invoice No</div><strong>${inv.invoiceNumber}</strong><br><br>
    <div class="label">Date</div><strong>${new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</strong>
  </div>
  <div class="meta-box" style="text-align:right">
    <div class="label">Bill To</div>
    <strong style="font-size:15px">${inv.customerName || 'Customer'}</strong>
  </div>
</div>
<table>
  <thead><tr><th>#</th><th>Description</th><th>Qty/Wt</th><th>Rate</th><th>Amount (₹)</th></tr></thead>
  <tbody>
    ${(inv.items || []).map((item, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${item.description}</td>
      <td>${item.weight ? (item.weight/1000).toFixed(2)+' Ton' : item.quantity+' '+item.unit}</td>
      <td>₹${(item.basePrice||0).toLocaleString('en-IN')}</td>
      <td>₹${(item.amount||0).toLocaleString('en-IN')}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div style="overflow:hidden">
  <div class="totals">
    <div class="total-row"><span>Gross Amount:</span><span>₹${(inv.subtotal||0).toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span>GST (${inv.gstPercent||0}%):</span><span>₹${(inv.gstAmount||0).toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span>TDS (${inv.tdsPercent||0}%):</span><span>-₹${(inv.tdsAmount||0).toLocaleString('en-IN')}</span></div>
    ${inv.transportCharges ? `<div class="total-row"><span>Transport:</span><span>₹${inv.transportCharges.toLocaleString('en-IN')}</span></div>` : ''}
    ${inv.dieselCharges ? `<div class="total-row"><span>Diesel:</span><span>₹${inv.dieselCharges.toLocaleString('en-IN')}</span></div>` : ''}
    <div class="total-row net"><span>NET AMOUNT:</span><span>₹${(inv.totalAmount||0).toLocaleString('en-IN')}</span></div>
    ${inv.paidAmount ? `<div class="total-row" style="color:green"><span>Received:</span><span>₹${inv.paidAmount.toLocaleString('en-IN')}</span></div>` : ''}
    ${inv.balanceAmount > 0 ? `<div class="total-row" style="color:red"><span>Balance Due:</span><span>₹${inv.balanceAmount.toLocaleString('en-IN')}</span></div>` : ''}
  </div>
</div>
<div class="footer">Thank you for your business | This is a computer generated invoice</div>
</body></html>`;

  const totalRevenue = sales.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalCollected = sales.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalPending = sales.reduce((s, i) => s + (i.balanceAmount || 0), 0);

  return (
    <div className="page animate-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Management</h1>
          <p className="page-subtitle">Sales to customers — FY {selectedFY?.label}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setModal(true); setError(''); }}>
            + Sales Entry
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar showSite showCompany onChange={({ site, company }) => {
        if (site !== undefined) setFilter(f => ({ ...f, site }));
      }} />

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Sales', val: `₹${totalRevenue.toLocaleString('en-IN')}`, color: '#3b82f6', icon: '💰' },
          { label: 'Collected', val: `₹${totalCollected.toLocaleString('en-IN')}`, color: '#22c55e', icon: '✅' },
          { label: 'Pending', val: `₹${totalPending.toLocaleString('en-IN')}`, color: '#ef4444', icon: '⏳' },
          { label: 'Invoices', val: sales.length, color: '#a855f7', icon: '🧾' },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 130px', background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', marginTop: 2 }}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="form-control" placeholder="🔍 Search customer, invoice no..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select className="form-select" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} style={{ maxWidth: 180 }}>
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        {(search || filter.status) && <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilter(f => ({ ...f, status: '' })); }}>✕ Reset</button>}
        <a href="/invoices" className="btn btn-outline" style={{ marginLeft: 'auto' }}>View All Invoices →</a>
      </div>

      {/* Table */}
      {loading ? <div className="loading-center"><div className="spinner" /></div> :
        sales.filter(inv =>
          !search ||
          inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
          inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
          inv.site?.name?.toLowerCase().includes(search.toLowerCase())
        ).length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem' }}>💼</div>
            <p>{search ? `No results for "${search}"` : `No sales entries for ${selectedFY?.label}. Create your first sales entry.`}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th><th>Date</th><th>Customer</th><th>Site</th>
                  <th>Gross (₹)</th><th>GST (₹)</th><th>TDS (₹)</th>
                  <th>Net (₹)</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.filter(inv =>
                  !search ||
                  inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
                  inv.customerName?.toLowerCase().includes(search.toLowerCase()) ||
                  inv.site?.name?.toLowerCase().includes(search.toLowerCase())
                ).map(inv => (
                  <tr key={inv._id}>
                    <td><span className="badge badge-gray">{inv.invoiceNumber}</span></td>
                    <td>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: 600 }}>{inv.customerName || '—'}</td>
                    <td>{inv.site?.name || '—'}</td>
                    <td>₹{(inv.subtotal || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#f59e0b' }}>₹{(inv.gstAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#ef4444' }}>-₹{(inv.tdsAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 700, color: '#22c55e' }}>₹{(inv.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{
                        padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem',
                        background: inv.paymentStatus === 'paid' ? '#22c55e22' : inv.paymentStatus === 'partial' ? '#f59e0b22' : '#ef444422',
                        color: inv.paymentStatus === 'paid' ? '#22c55e' : inv.paymentStatus === 'partial' ? '#f59e0b' : '#ef4444',
                      }}>{inv.paymentStatus}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" title="Preview" onClick={() => setViewInvoice(inv)}>👁️</button>
                        <button className="btn-icon" title="Print" onClick={() => handlePrint(inv)}>🖨️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth:780, width:'95%', maxHeight:'92vh', overflow:'auto' }}>
            <div className="modal-header">
              <h2>💼 New Sales Entry</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:12 }}>{error}</div>}

            {/* Header Info */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
              <ComboInput
                label="Customer" required
                value={form.customerName}
                options={customers}
                onSelect={c => setForm(f => ({ ...f, customer: c._id, customerName: c.name, tdsPercent: c.tdsPercent || f.tdsPercent }))}
                onChange={name => setForm(f => ({ ...f, customerName: name, customer: '' }))}
                placeholder="Type or select customer…"
              />
              <div className="form-group">
                <label className="form-label">Sale Date</label>
                <input type="date" className="form-input" value={form.saleDate}
                  onChange={e => setForm(f => ({ ...f, saleDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Site *</label>
                <select className="form-select" value={form.site}
                  onChange={e => setForm(f => ({ ...f, site: e.target.value }))}>
                  <option value="">Select Site</option>
                  {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">GST %</label>
                <input type="number" className="form-input" value={form.gstPercent}
                  onChange={e => setForm(f => ({ ...f, gstPercent: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">TDS %</label>
                <input type="number" className="form-input" value={form.tdsPercent}
                  onChange={e => setForm(f => ({ ...f, tdsPercent: e.target.value }))} />
              </div>
            </div>

            {/* Sales Items Table */}
            <div style={{ background:'var(--clr-bg)', borderRadius:8, padding:14, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <strong>Sales Items</strong>
                <button className="btn btn-outline" style={{ padding:'4px 12px', fontSize:'0.82rem' }} onClick={addItem}>+ Item</button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr auto', gap:8, marginBottom:8, alignItems:'end' }}>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize:'0.75rem' }}>Description</label>}
                    <input className="form-input" value={item.description} placeholder="Material / work description"
                      onChange={e => updateItem(idx, 'description', e.target.value)} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize:'0.75rem' }}>Billing</label>}
                    <select className="form-select" value={item.billingType}
                      onChange={e => updateItem(idx, 'billingType', e.target.value)}>
                      <option value="trip">Per Trip</option>
                      <option value="ton">Per Ton</option>
                      <option value="kg">Per KG</option>
                      <option value="unit">Per Unit</option>
                      <option value="hour">Per Hour</option>
                      <option value="day">Per Day</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize:'0.75rem' }}>Qty / Trips</label>}
                    <input type="number" className="form-input" value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize:'0.75rem' }}>Weight (KG)</label>}
                    <input type="number" className="form-input" value={item.weight}
                      onChange={e => updateItem(idx, 'weight', e.target.value)} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize:'0.75rem' }}>Base Price (₹)</label>}
                    <input type="number" className="form-input" value={item.basePrice}
                      onChange={e => updateItem(idx, 'basePrice', e.target.value)} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize:'0.75rem' }}>Amount</label>}
                    <input className="form-input" readOnly value={`₹${(item.amount||0).toLocaleString('en-IN')}`}
                      style={{ background:'var(--clr-bg)', fontWeight:600 }} />
                  </div>
                  <div style={{ paddingTop: idx === 0 ? '20px' : '0' }}>
                    {form.items.length > 1 && (
                      <button style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:'1.1rem' }}
                        onClick={() => removeItem(idx)}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Charges */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group">
                <label className="form-label">Transport Charges (₹)</label>
                <input type="number" className="form-input" value={form.transportCharges}
                  onChange={e => setForm(f => ({ ...f, transportCharges: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Diesel Charges (₹)</label>
                <input type="number" className="form-input" value={form.dieselCharges}
                  onChange={e => setForm(f => ({ ...f, dieselCharges: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Other Deductions (₹)</label>
                <input type="number" className="form-input" value={form.otherDeductions}
                  onChange={e => setForm(f => ({ ...f, otherDeductions: e.target.value }))} />
              </div>
            </div>

            {/* Totals Summary */}
            <div style={{ background:'var(--clr-primary)11', border:'1px solid var(--clr-primary)33', borderRadius:10, padding:16, marginBottom:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, textAlign:'center' }}>
                {[
                  { label:'Subtotal',              val: `₹${subtotal.toLocaleString('en-IN')}` },
                  { label:`GST (${form.gstPercent}%)`, val: `₹${gstAmt.toLocaleString('en-IN')}` },
                  { label:`TDS (${form.tdsPercent}%)`, val: `-₹${tdsAmt.toLocaleString('en-IN')}` },
                  { label:'NET TOTAL',             val: `₹${totalAmount.toLocaleString('en-IN')}`, bold:true },
                ].map(t => (
                  <div key={t.label}>
                    <div style={{ fontSize:'0.75rem', color:'var(--clr-text3)' }}>{t.label}</div>
                    <div style={{ fontSize: t.bold ? '1.2rem':'1rem', fontWeight: t.bold ? 700:600, color: t.bold ? 'var(--clr-primary)':'var(--clr-text)' }}>{t.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:16, borderTop:'1px solid var(--clr-border)' }}>
              <button className="btn btn-outline" onClick={() => { setForm(EMPTY_FORM); setError(''); }}>Reset</button>
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {viewInvoice && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewInvoice(null)}>
          <div className="modal" style={{ maxWidth: 600, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Invoice Preview</h2>
              <button className="modal-close" onClick={() => setViewInvoice(null)}>✕</button>
            </div>
            <div style={{ background: '#fff', color: '#222', padding: 24, borderRadius: 8 }}>
              <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '2px solid #1d4ed8', paddingBottom: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1d4ed8' }}>LOGICORE ERP</div>
                <div style={{ fontSize: 12, color: '#666' }}>Tax Invoice</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13 }}>
                <div>
                  <div style={{ color: '#888', fontSize: 11 }}>INVOICE NO</div>
                  <strong>{viewInvoice.invoiceNumber}</strong><br />
                  <div style={{ color: '#888', fontSize: 11, marginTop: 6 }}>DATE</div>
                  <strong>{new Date(viewInvoice.invoiceDate).toLocaleDateString('en-IN')}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#888', fontSize: 11 }}>CUSTOMER</div>
                  <strong style={{ fontSize: 15, color: '#1d4ed8' }}>{viewInvoice.customerName}</strong>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 13 }}>
                <thead><tr style={{ background: '#1d4ed8', color: '#fff' }}>
                  <th style={{ padding: '7px 10px', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '7px 10px' }}>Qty</th>
                  <th style={{ padding: '7px 10px' }}>Rate</th>
                  <th style={{ padding: '7px 10px', textAlign: 'right' }}>Amount</th>
                </tr></thead>
                <tbody>
                  {(viewInvoice.items || []).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '7px 10px' }}>{item.description}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>{item.quantity || item.weight}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>₹{(item.basePrice || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>₹{(item.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: 260 }}>
                  <span>Gross Amount:</span><strong>₹{(viewInvoice.subtotal || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: 260 }}>
                  <span>GST ({viewInvoice.gstPercent}%):</span><span>₹{(viewInvoice.gstAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: 260, color: '#ef4444' }}>
                  <span>TDS ({viewInvoice.tdsPercent}%):</span><span>-₹{(viewInvoice.tdsAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: 260, fontWeight: 900, fontSize: 16, color: '#1d4ed8', borderTop: '2px solid #1d4ed8', paddingTop: 6, marginTop: 4 }}>
                  <span>NET AMOUNT:</span><span>₹{(viewInvoice.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--clr-border)' }}>
              <button className="btn btn-outline" onClick={() => setViewInvoice(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => handlePrint(viewInvoice)}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
