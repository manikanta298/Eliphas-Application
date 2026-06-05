import './Transactions.css';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import { useSite } from '../../contexts/SiteContext';
import { formatCurrency, formatDate } from '../../utils/helpers';

const TYPE_META = {
  receipt:          { label: 'Receipt',          icon: '⬇️', color: '#22c55e' },
  payment:          { label: 'Payment',           icon: '⬆️', color: '#ef4444' },
  advance_given:    { label: 'Advance Given',     icon: '➡️', color: '#f59e0b' },
  advance_received: { label: 'Advance Received',  icon: '⬅️', color: '#3b82f6' },
  adjustment:       { label: 'Adjustment',        icon: '🔄', color: '#a855f7' },
};

const makeEmpty = (siteId = '', fy = '') => ({
  type: 'advance_given', advanceType: 'general', category: 'cash', partyType: 'customer',
  party: '', partyName: '', amount: '',
  date: new Date().toISOString().slice(0, 10),
  referenceNo: '', bankName: '', description: '', notes: '',
  linkedInvoice: '', site: siteId, financialYear: fy,
});

export default function TransactionsPage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const { selectedSite } = useSite();
  const siteId = selectedSite?._id || '';

  const [txns, setTxns]       = useState([]);
  const [summary, setSummary] = useState({});
  const [companies, setCompanies] = useState([]);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(makeEmpty(siteId, selectedFY?.label));
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState({ type: '' });
  const [activeTab, setActiveTab] = useState('advances');

  const fetch = () => {
    if (!siteId) return;
    setLoading(true);
    const params = { financialYear: selectedFY?.label, site: siteId, limit: 100 };
    if (filter.type) params.type = filter.type;
    api.get('/transactions', { params })
      .then(r => { setTxns(r.data.data || []); setSummary(r.data.summary || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [selectedFY, siteId, filter]);

  useEffect(() => {
    if (!siteId) return;
    api.get('/companies', { params: { limit: 200 } }).then(r => setCompanies(r.data.data || [])).catch(() => {});
    api.get('/invoices', { params: { site: siteId, financialYear: selectedFY?.label, limit: 100, type: 'customer' } })
      .then(r => setInvoices(r.data.data || [])).catch(() => {});
  }, [siteId, selectedFY]);

  useEffect(() => { setForm(makeEmpty(siteId, selectedFY?.label)); }, [siteId, selectedFY]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.date) { setError('Amount and Date are required'); return; }
    if (!form.date) { setError('Advance Date is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, amount: Number(form.amount), financialYear: selectedFY?.label, site: siteId };
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      await api.post('/transactions', payload);
      setModal(false);
      fetch();
    } catch (err) { setError(err.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const displayed = txns.filter(t => {
    if (activeTab === 'advances') return ['advance_given','advance_received'].includes(t.type);
    if (activeTab === 'receipts') return ['receipt','payment'].includes(t.type);
    return true;
  }).filter(t => !search || (t.partyName || '').toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">💳 Advances & Payments</h2>
          <p className="page-subtitle">{selectedSite?.name || '—'} · FY {selectedFY?.label}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(makeEmpty(siteId, selectedFY?.label)); setError(''); setModal(true); }}>
          + New Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[
          { label:'Cash In',  value: formatCurrency(summary.cashIn),  color:'#16a34a' },
          { label:'Cash Out', value: formatCurrency(summary.cashOut), color:'#dc2626' },
          { label:'Balance',  value: formatCurrency(summary.balance), color: (summary.balance || 0) >= 0 ? '#16a34a' : '#dc2626' },
        ].map((s,i) => (
          <div key={i} className="card" style={{ padding:'10px 18px', minWidth:130 }}>
            <span style={{ fontSize:'0.72rem', color:'var(--clr-text3)', textTransform:'uppercase' }}>{s.label}</span>
            <div style={{ fontWeight:700, fontSize:'1.1rem', color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {[
          { key:'advances', label:'💳 Advances' },
          { key:'receipts', label:'💰 Receipts/Payments' },
          { key:'all',      label:'📋 All' },
        ].map(tab => (
          <button key={tab.key} className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
        <input className="form-control" style={{ flex:1, minWidth:200, marginLeft:8 }}
          placeholder="🔍 Search party, description…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-outline" onClick={() => { setSearch(''); setFilter({ type:'' }); }}>✕ Reset</button>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
        ) : displayed.length === 0 ? (
          <div className="empty-state"><div style={{ fontSize:'2.5rem' }}>💳</div><p>No transactions found</p></div>
        ) : (
          <div className="txn-table" style={{ overflowX:'auto' }}>            <table className="table">
              <thead>
                <tr><th>Txn #</th><th>Date</th><th>Type</th><th>Advance Type</th><th>Party</th><th>Category</th><th>Amount</th><th>Invoice</th></tr>
              </thead>
              <tbody>
                {displayed.map(t => {
                  const meta = TYPE_META[t.type] || {};
                  return (
                    <tr key={t._id}>
                      <td><span className="badge badge-gray">{t.transactionNumber}</span></td>
                      <td>{formatDate(t.date)}</td>
                      <td><span style={{ color: meta.color, fontWeight:700, fontSize:'0.82rem' }}>{meta.icon} {meta.label}</span></td>
                      <td><span className="badge badge-gray" style={{ fontSize:'0.72rem' }}>{t.advanceType ? t.advanceType.replace('_',' ') : '—'}</span></td>
                      <td>{t.partyName || t.party?.name || '—'}</td>
                      <td><span className="badge badge-gray">{t.category}</span></td>
                      <td><strong style={{ color: meta.color }}>{formatCurrency(t.amount)}</strong></td>
                      <td style={{ fontSize:'0.78rem' }}>{t.linkedInvoice?.invoiceNumber || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Transaction / Advance">
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'var(--sp-4)' }}>
          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-control" required value={form.type} onChange={e => set('type', e.target.value)}>
                {Object.entries(TYPE_META).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: !form.date ? '#dc2626' : undefined }}>
                {['advance_given','advance_received'].includes(form.type) ? 'Advance Date' : 'Date'} *
                {!form.date && <span style={{ fontSize:'0.75rem', color:'#dc2626', marginLeft:6 }}>⚠ Required</span>}
              </label>
              <input type="date" className="form-control" required value={form.date}
                onChange={e => set('date', e.target.value)}
                style={{ border: !form.date ? '2px solid #dc2626' : undefined }} />
            </div>
          </div>

          {/* Advance Type — only shown for advance transactions */}
          {['advance_given','advance_received'].includes(form.type) && (
            <div className="form-group">
              <label className="form-label">Advance Type *</label>
              <select className="form-control" required value={form.advanceType} onChange={e => set('advanceType', e.target.value)}>
                <option value="general">General Advance</option>
                <option value="against_work">Against Work / Trip</option>
                <option value="against_purchase">Against Purchase</option>
                <option value="against_invoice">Against Invoice</option>
                <option value="salary">Salary Advance</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input type="number" step="0.01" className="form-control" required value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                {['cash','bank','upi','cheque','neft','rtgs','other'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Party Type</label>
              <select className="form-control" value={form.partyType} onChange={e => set('partyType', e.target.value)}>
                {['customer','supplier','vendor','driver','other'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Party</label>
              <select className="form-control" value={form.party} onChange={e => { set('party', e.target.value); const c = companies.find(c=>c._id===e.target.value); if(c) set('partyName', c.name); }}>
                <option value="">Select party…</option>
                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Party Name (manual)</label>
            <input className="form-control" value={form.partyName} onChange={e => set('partyName', e.target.value)} placeholder="Or type name manually" />
          </div>

          <div className="form-group" style={{ background: ['advance_given','advance_received'].includes(form.type) ? '#f0fdf4' : undefined, padding: ['advance_given','advance_received'].includes(form.type) ? '10px 12px' : undefined, borderRadius: 8, border: ['advance_given','advance_received'].includes(form.type) ? '1px solid #bbf7d0' : undefined }}>
            <label className="form-label">
              {['advance_given','advance_received'].includes(form.type) ? '🔗 Adjust Against Invoice (optional)' : 'Link to Invoice (optional)'}
            </label>
            <select className="form-control" value={form.linkedInvoice} onChange={e => set('linkedInvoice', e.target.value)}>
              <option value="">No invoice link</option>
              {invoices.map(inv => <option key={inv._id} value={inv._id}>{inv.invoiceNumber} — {formatCurrency(inv.totalAmount)}</option>)}
            </select>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Reference No.</label>
              <input className="form-control" value={form.referenceNo} onChange={e => set('referenceNo', e.target.value)} placeholder="Cheque/UTR/UPI" />
            </div>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input className="form-control" value={form.bankName} onChange={e => set('bankName', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => setForm(makeEmpty(siteId, selectedFY?.label))}>🔄 Reset</button>
            <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
