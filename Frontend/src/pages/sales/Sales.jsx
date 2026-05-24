import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import FilterBar from '../../components/common/FilterBar';

const BILLING_TYPES = ['trip','ton','kg','unit','hour','day','weekly','monthly','fixed'];

const EMPTY_FORM = {
  customer: '', customerName: '',
  site: '', product: '', productName: '',
  billingType: 'ton',
  quantity: '', weight: '', unit: 'Ton',
  rate: '', marginPercent: '',
  gstPercent: 18, tdsPercent: 2,
  transportCharges: 0, dieselCharges: 0,
  notes: '',
};

function calcSales(form) {
  const qty    = Number(form.quantity)  || 0;
  const wt     = Number(form.weight)   || 0;
  const rate   = Number(form.rate)     || 0;
  const margin = Number(form.marginPercent) || 0;
  const gst    = Number(form.gstPercent)    || 0;
  const tds    = Number(form.tdsPercent)    || 0;
  const trans  = Number(form.transportCharges) || 0;
  const diesel = Number(form.dieselCharges) || 0;

  let baseQty = form.billingType === 'ton' ? wt / 1000
              : form.billingType === 'kg'  ? wt
              : qty;

  const baseAmount  = baseQty * rate;
  const marginAmt   = baseAmount * (margin / 100);
  const grossAmount = baseAmount + trans + diesel;
  const gstAmount   = grossAmount * (gst / 100);
  const tdsAmount   = grossAmount * (tds / 100);
  const netAmount   = grossAmount + gstAmount - tdsAmount;

  return { baseAmount, marginAmt, grossAmount, gstAmount, tdsAmount, netAmount, baseQty };
}

export default function SalesPage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sites, setSites] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ site: '', status: '' });
  const [viewInvoice, setViewInvoice] = useState(null);

  const calc = calcSales(form);

  const fetchSales = () => {
    setLoading(true);
    const params = { type: 'customer', financialYear: selectedFY?.label };
    if (filter.site) params.site = filter.site;
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

  useEffect(() => { if (selectedFY) fetchSales(); }, [selectedFY, filter]);

  const handleProductSelect = (pid) => {
    const prod = products.find(p => p._id === pid);
    if (prod) {
      setForm(f => ({
        ...f, product: pid, productName: prod.name,
        rate: prod.sellingRate || prod.purchaseRate || '',
        marginPercent: prod.marginPercent || '',
        gstPercent: prod.gstPercent || 18,
        tdsPercent: prod.tdsPercent || 2,
        unit: prod.unit || 'Ton',
        billingType: prod.billingType || 'ton',
      }));
    }
  };

  const handleCustomerSelect = (cid) => {
    const cust = customers.find(c => c._id === cid);
    setForm(f => ({
      ...f, customer: cid, customerName: cust?.name || '',
      tdsPercent: cust?.tdsPercent || 2,
    }));
  };

  const handleSave = async () => {
    if (!form.customerName || !form.site || !form.rate) {
      setError('Customer, Site and Rate are required');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        invoiceType: 'customer',
        financialYear: selectedFY?.label,
        customer: form.customer || undefined,
        customerName: form.customerName,
        site: form.site,
        invoiceDate: new Date(),
        items: [{
          description: form.productName || 'Supply',
          billingType: form.billingType,
          quantity: Number(form.quantity) || 0,
          weight: Number(form.weight) || 0,
          unit: form.unit,
          basePrice: Number(form.rate),
          marginPercent: Number(form.marginPercent) || 0,
          amount: calc.grossAmount,
        }],
        subtotal: calc.grossAmount,
        gstPercent: form.gstPercent,
        gstAmount: calc.gstAmount,
        tdsPercent: form.tdsPercent,
        tdsAmount: calc.tdsAmount,
        transportCharges: Number(form.transportCharges) || 0,
        dieselCharges: Number(form.dieselCharges) || 0,
        totalAmount: calc.netAmount,
        notes: form.notes,
        // Internal (admin-only)
        internalMargin: calc.marginAmt,
      };
      await api.post('/invoices', payload);
      setModal(false);
      setForm(EMPTY_FORM);
      fetchSales();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
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

  const inp = (f) => ({
    value: form[f] ?? '',
    onChange: e => setForm(p => ({ ...p, [f]: e.target.value })),
    className: 'form-input',
  });

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
        <select className="form-select" value={filter.site} onChange={e => setFilter(f => ({ ...f, site: e.target.value }))} style={{ maxWidth: 200 }}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select className="form-select" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} style={{ maxWidth: 180 }}>
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <a href="/invoices" className="btn btn-outline" style={{ marginLeft: 'auto' }}>View All Invoices →</a>
      </div>

      {/* Table */}
      {loading ? <div className="loading-center"><div className="spinner" /></div> :
        sales.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem' }}>💼</div>
            <p>No sales entries for {selectedFY?.label}. Create your first sales entry.</p>
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
                {sales.map(inv => (
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

      {/* Sales Entry Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 700, width: '95%', maxHeight: '92vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>💼 Sales Entry</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select className="form-select" value={form.customer} onChange={e => handleCustomerSelect(e.target.value)}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Customer Name (override)</label>
                <input {...inp('customerName')} placeholder="Manual customer name" />
              </div>
              <div className="form-group">
                <label className="form-label">Site *</label>
                <select className="form-select" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))}>
                  <option value="">Select Site</option>
                  {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Product</label>
                <select className="form-select" value={form.product} onChange={e => handleProductSelect(e.target.value)}>
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Billing Type</label>
                <select className="form-select" value={form.billingType} onChange={e => setForm(f => ({ ...f, billingType: e.target.value }))}>
                  {BILLING_TYPES.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {['Ton','KG','Trip','Unit','Hour','Day'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input type="number" {...inp('quantity')} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Weight (KG)</label>
                <input type="number" {...inp('weight')} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Rate (₹)</label>
                <input type="number" {...inp('rate')} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Margin % {can('canViewProfit') ? '(internal)' : ''}</label>
                <input type="number" {...inp('marginPercent')} placeholder="0" disabled={!can('canViewProfit')} />
              </div>
              <div className="form-group">
                <label className="form-label">GST %</label>
                <input type="number" {...inp('gstPercent')} />
              </div>
              <div className="form-group">
                <label className="form-label">TDS %</label>
                <input type="number" {...inp('tdsPercent')} />
              </div>
              <div className="form-group">
                <label className="form-label">Transport (₹)</label>
                <input type="number" {...inp('transportCharges')} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Diesel (₹)</label>
                <input type="number" {...inp('dieselCharges')} placeholder="0" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Notes</label>
                <textarea {...inp('notes')} rows={2} className="form-input" />
              </div>
            </div>

            {/* Live Calculation Summary */}
            <div style={{ background: 'var(--clr-bg)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--clr-border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--clr-text3)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Calculation Preview</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'Base Amount', val: calc.baseAmount },
                  { label: `GST (${form.gstPercent}%)`, val: calc.gstAmount },
                  { label: `TDS (${form.tdsPercent}%)`, val: -calc.tdsAmount },
                  ...(can('canViewProfit') ? [{ label: `Margin (${form.marginPercent}%)`, val: calc.marginAmt, highlight: '#22c55e' }] : []),
                ].map((r, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--clr-text3)' }}>{r.label}</div>
                    <div style={{ fontWeight: 700, color: r.highlight || 'var(--clr-text)', fontSize: '0.95rem' }}>
                      {r.val < 0 ? '-' : ''}₹{Math.abs(r.val || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--clr-border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--clr-text3)', fontSize: '0.85rem' }}>NET AMOUNT</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--clr-primary)' }}>
                  ₹{calc.netAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--clr-border)' }}>
              <button className="btn btn-outline" onClick={handleReset}>Reset</button>
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
