import './Purchase.css';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import FilterBar from '../../components/common/FilterBar';
import { formatCurrency } from '../../utils/helpers';

const PAY_COLORS = { unpaid: '#ef4444', partial: '#f59e0b', paid: '#22c55e' };

const EMPTY_FORM = {
  supplierName: '', supplier: '',
  supplierInvoiceNo: '', supplierInvoiceDate: '',
  site: '', vehicle: '', vehicleNumber: '', driver: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  items: [{ description: '', billingType: 'ton', quantity: 0, weight: 0, unit: 'Ton', basePrice: 0, amount: 0 }],
  gstPercent: 18, tdsPercent: 0, transportCharges: 0, dieselCharges: 0,
  otherDeductions: 0, paidAmount: 0, paymentMode: 'cash', notes: '',
};

function calcItem(item) {
  const qty = Number(item.quantity) || 0;
  const weight = Number(item.weight) || 0;
  const price = Number(item.basePrice) || 0;
  let amt = 0;
  if (item.billingType === 'ton') amt = (weight / 1000) * price;
  else if (item.billingType === 'kg') amt = weight * price;
  else amt = qty * price;
  return { ...item, amount: Math.round(amt * 100) / 100 };
}

function calcTotals(form) {
  const subtotal = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const gstAmt = subtotal * (Number(form.gstPercent) / 100);
  const tdsAmt = subtotal * (Number(form.tdsPercent) / 100);
  const total = subtotal + gstAmt - tdsAmt + Number(form.transportCharges || 0) + Number(form.dieselCharges || 0) - Number(form.otherDeductions || 0);
  return { subtotal, gstAmt, tdsAmt, totalAmount: Math.round(total * 100) / 100 };
}

export default function PurchasePage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const [purchases, setPurchases] = useState([]);
  const [totals, setTotals] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [sites, setSites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ paymentStatus: '', site: '' });
  const [payForm, setPayForm] = useState({ amount: '', mode: 'cash', reference: '', notes: '' });

  const fetchPurchases = () => {
    setLoading(true);
    const params = { financialYear: selectedFY?.label };
    if (filter.paymentStatus) params.paymentStatus = filter.paymentStatus;
    if (filter.site) params.site = filter.site;
    api.get('/purchases', { params })
      .then(r => { setPurchases(r.data.data || []); setTotals(r.data.totals || {}); })
      .catch(e => setError(e.response?.data?.message || 'Failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get('/companies', { params: { type: 'supplier' } }),
      api.get('/sites'),
      api.get('/vehicles'),
      api.get('/drivers'),
      api.get('/products'),
    ]).then(([sup, s, v, d, p]) => {
      setSuppliers(sup.data.data || []);
      setSites(s.data.data || []);
      setVehicles(v.data.data || []);
      setDrivers(d.data.data || []);
      setProducts(p.data.data || []);
    });
  }, []);

  useEffect(() => { if (selectedFY) fetchPurchases(); }, [selectedFY, filter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, purchaseDate: new Date().toISOString().slice(0, 10) });
    setModal(true);
    setError('');
  };

  const updateItem = (idx, field, val) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = calcItem({ ...items[idx], [field]: val });
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({
    ...f,
    items: [...f.items, { description: '', billingType: 'ton', quantity: 0, weight: 0, unit: 'Ton', basePrice: 0, amount: 0 }],
  }));

  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const { subtotal, gstAmt, tdsAmt, totalAmount } = calcTotals(form);

  const handleSave = async () => {
    if (!form.supplierName || !form.site) {
      setError('Supplier name and site are required');
      return;
    }
    if (!form.items.length) { setError('Add at least one item'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        financialYear: selectedFY?.label,
        subtotal,
        gstAmount: gstAmt,
        tdsAmount: tdsAmt,
        totalAmount,
        items: form.items.map(i => ({ ...i, amount: Number(i.amount) })),
      };
      if (!payload.supplier) delete payload.supplier;
      if (!payload.vehicle) delete payload.vehicle;
      if (!payload.driver) delete payload.driver;
      if (editing) await api.put(`/purchases/${editing._id}`, payload);
      else await api.post('/purchases', payload);
      setModal(false);
      fetchPurchases();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) { alert('Enter valid amount'); return; }
    try {
      await api.post(`/purchases/${payModal._id}/payment`, payForm);
      setPayModal(null);
      setPayForm({ amount: '', mode: 'cash', reference: '', notes: '' });
      fetchPurchases();
    } catch (e) { alert(e.response?.data?.message || 'Payment failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase entry?')) return;
    try { await api.delete(`/purchases/${id}`); fetchPurchases(); }
    catch (e) { alert(e.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Management</h1>
          <p className="page-subtitle">Supplier purchase entries — {selectedFY?.label}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Purchase</button>
      </div>

      {/* Filter Bar — FY + Site + Company on every screen */}
      <FilterBar showSite showCompany={false} onChange={({ financialYear, site }) => {
        if (site !== undefined) setFilter(f => ({ ...f, site }));
      }} />

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Purchase', val: formatCurrency(totals.totalAmount), color: '#3b82f6' },
          { label: 'Paid', val: formatCurrency(totals.paidAmount), color: '#22c55e' },
          { label: 'Pending', val: formatCurrency(totals.balanceAmount), color: '#ef4444' },
          { label: 'Entries', val: totals.count || 0, color: '#a855f7' },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 130px', background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '14px 18px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <select className="form-select" value={filter.paymentStatus}
          onChange={e => setFilter(f => ({ ...f, paymentStatus: e.target.value }))} style={{ maxWidth: '180px' }}>
          <option value="">All Payment Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <select className="form-select" value={filter.site}
          onChange={e => setFilter(f => ({ ...f, site: e.target.value }))} style={{ maxWidth: '200px' }}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <div className="loading-center"><div className="spinner" /></div> :
        purchases.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem' }}>📦</div>
            <p>No purchase entries yet for {selectedFY?.label}. Add first purchase.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Purchase No.</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Site</th>
                  <th>Vehicle</th>
                  <th>Supplier Inv.</th>
                  <th>Total (₹)</th>
                  <th>Paid (₹)</th>
                  <th>Balance (₹)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p._id}>
                    <td><span className="badge badge-gray">{p.purchaseNumber}</span></td>
                    <td>{new Date(p.purchaseDate).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: 600 }}>{p.supplierName}</td>
                    <td>{p.site?.name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.vehicleNumber || p.vehicle?.vehicleNumber || '—'}</td>
                    <td>{p.supplierInvoiceNo || '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{(p.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#22c55e' }}>₹{(p.paidAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ color: '#ef4444' }}>₹{(p.balanceAmount || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{
                        padding: '2px 10px', borderRadius: '20px', fontSize: '0.78rem',
                        background: PAY_COLORS[p.paymentStatus] + '22',
                        color: PAY_COLORS[p.paymentStatus],
                        border: `1px solid ${PAY_COLORS[p.paymentStatus]}44`,
                      }}>{p.paymentStatus}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        {p.paymentStatus !== 'paid' && (
                          <button className="btn-icon" title="Record Payment" onClick={() => {
                            setPayModal(p);
                            setPayForm({ amount: '', mode: 'cash', reference: '', notes: '' });
                          }}>💳</button>
                        )}
                        {can('canDeleteFinancial') && (
                          <button className="btn-icon btn-danger" onClick={() => handleDelete(p._id)}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Create Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: '780px', width: '95%', maxHeight: '92vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>New Purchase Entry</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>}

            {/* Header info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Supplier *</label>
                <select className="form-select" value={form.supplier}
                  onChange={e => {
                    const sup = suppliers.find(s => s._id === e.target.value);
                    setForm(f => ({ ...f, supplier: e.target.value, supplierName: sup?.name || '' }));
                  }}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Supplier Name (manual)</label>
                <input className="form-input" value={form.supplierName}
                  onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
                  placeholder="Override supplier name" />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Date</label>
                <input type="date" className="form-input" value={form.purchaseDate}
                  onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
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
                <label className="form-label">Vehicle</label>
                <select className="form-select" value={form.vehicle}
                  onChange={e => {
                    const v = vehicles.find(v => v._id === e.target.value);
                    setForm(f => ({ ...f, vehicle: e.target.value, vehicleNumber: v?.vehicleNumber || '' }));
                  }}>
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Driver</label>
                <select className="form-select" value={form.driver}
                  onChange={e => setForm(f => ({ ...f, driver: e.target.value }))}>
                  <option value="">Select Driver</option>
                  {drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Supplier Invoice No.</label>
                <input className="form-input" value={form.supplierInvoiceNo}
                  onChange={e => setForm(f => ({ ...f, supplierInvoiceNo: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Supplier Invoice Date</label>
                <input type="date" className="form-input" value={form.supplierInvoiceDate}
                  onChange={e => setForm(f => ({ ...f, supplierInvoiceDate: e.target.value }))} />
              </div>
            </div>

            {/* Items */}
            <div style={{ background: 'var(--clr-bg)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong>Purchase Items</strong>
                <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.82rem' }} onClick={addItem}>+ Item</button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: '0.75rem' }}>Description</label>}
                    <input className="form-input" value={item.description} placeholder="Material / work description"
                      onChange={e => updateItem(idx, 'description', e.target.value)} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: '0.75rem' }}>Billing</label>}
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
                    {idx === 0 && <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty / Trips</label>}
                    <input type="number" className="form-input" value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: '0.75rem' }}>Weight (KG)</label>}
                    <input type="number" className="form-input" value={item.weight}
                      onChange={e => updateItem(idx, 'weight', e.target.value)} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: '0.75rem' }}>Base Price (₹)</label>}
                    <input type="number" className="form-input" value={item.basePrice}
                      onChange={e => updateItem(idx, 'basePrice', e.target.value)} />
                  </div>
                  <div>
                    {idx === 0 && <label className="form-label" style={{ fontSize: '0.75rem' }}>Amount</label>}
                    <input className="form-input" readOnly value={`₹${(item.amount || 0).toLocaleString('en-IN')}`}
                      style={{ background: 'var(--clr-bg)', fontWeight: 600 }} />
                  </div>
                  <div style={{ paddingTop: idx === 0 ? '20px' : '0' }}>
                    {form.items.length > 1 && (
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.1rem' }}
                        onClick={() => removeItem(idx)}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Charges & Tax */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
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
              <div className="form-group">
                <label className="form-label">Advance Paid (₹)</label>
                <input type="number" className="form-input" value={form.paidAmount}
                  onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} />
              </div>
            </div>

            {/* Totals summary */}
            <div style={{ background: 'var(--clr-primary)11', border: '1px solid var(--clr-primary)33', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                {[
                  { label: 'Subtotal', val: formatCurrency(subtotal) },
                  { label: `GST (${form.gstPercent}%)`, val: formatCurrency(gstAmt) },
                  { label: `TDS (${form.tdsPercent}%)`, val: `-${formatCurrency(tdsAmt)}` },
                  { label: 'NET TOTAL', val: formatCurrency(totalAmount), bold: true },
                ].map(t => (
                  <div key={t.label}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text3)' }}>{t.label}</div>
                    <div style={{ fontSize: t.bold ? '1.2rem' : '1rem', fontWeight: t.bold ? 700 : 600, color: t.bold ? 'var(--clr-primary)' : 'var(--clr-text)' }}>{t.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--clr-border)' }}>
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal" style={{ maxWidth: '420px', width: '95%' }}>
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button className="modal-close" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--clr-bg)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--clr-text3)' }}>{payModal.purchaseNumber} • {payModal.supplierName}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
                Pending: {formatCurrency(payModal.balanceAmount)}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input type="number" className="form-input" value={payForm.amount}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  max={payModal.balanceAmount} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-select" value={payForm.mode}
                  onChange={e => setPayForm(f => ({ ...f, mode: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="upi">UPI</option>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Reference No.</label>
                <input className="form-input" value={payForm.reference}
                  onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="UTR / cheque number" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--clr-border)' }}>
              <button className="btn btn-outline" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePayment}>Record Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
