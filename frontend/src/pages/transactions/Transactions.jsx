import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';

const TYPE_META = {
  receipt:          { label: 'Receipt',          icon: '⬇️', color: '#22c55e' },
  payment:          { label: 'Payment',           icon: '⬆️', color: '#ef4444' },
  advance_given:    { label: 'Advance Given',     icon: '➡️', color: '#f59e0b' },
  advance_received: { label: 'Advance Received',  icon: '⬅️', color: '#3b82f6' },
  adjustment:       { label: 'Adjustment',        icon: '🔄', color: '#a855f7' },
};

const EMPTY_FORM = {
  type: 'receipt', category: 'cash', partyType: 'customer',
  party: '', partyName: '', amount: '', date: new Date().toISOString().slice(0, 10),
  referenceNo: '', bankName: '', description: '', notes: '',
  site: '',
};

export default function TransactionsPage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const [txns, setTxns] = useState([]);
  const [summary, setSummary] = useState({});
  const [companies, setCompanies] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ type: '', category: '', site: '' });
  const [activeTab, setActiveTab] = useState('all');

  const fetchTxns = () => {
    setLoading(true);
    const params = { financialYear: selectedFY?.label, limit: 100 };
    if (filter.type) params.type = filter.type;
    if (filter.category) params.category = filter.category;
    if (filter.site) params.site = filter.site;
    api.get('/transactions', { params })
      .then(r => { setTxns(r.data.data || []); setSummary(r.data.summary || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      api.get('/companies'),
      api.get('/sites'),
    ]).then(([c, s]) => {
      setCompanies(c.data.data || []);
      setSites(s.data.data || []);
    });
  }, []);

  useEffect(() => { if (selectedFY) fetchTxns(); }, [selectedFY, filter]);

  const handleSave = async () => {
    if (!form.amount || !form.date) { setError('Amount and Date are required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/transactions', { ...form, financialYear: selectedFY?.label, amount: Number(form.amount) });
      setModal(false);
      setForm(EMPTY_FORM);
      fetchTxns();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try { await api.delete(`/transactions/${id}`); fetchTxns(); }
    catch (e) { alert(e.response?.data?.message || 'Delete failed'); }
  };

  const inp = (f) => ({
    value: form[f] ?? '',
    onChange: e => setForm(p => ({ ...p, [f]: e.target.value })),
    className: 'form-input',
  });

  const tabFiltered = {
    all:      txns,
    cash:     txns.filter(t => t.category === 'cash'),
    advance:  txns.filter(t => ['advance_given', 'advance_received'].includes(t.type)),
    history:  txns.filter(t => ['receipt', 'payment'].includes(t.type)),
  };

  const visible = tabFiltered[activeTab] || txns;

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Cash, Advance &amp; Payment History — {selectedFY?.label}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal(true); setError(''); }}>
          + Add Transaction
        </button>
      </div>

      {/* Balance Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Cash In', val: summary.cashIn || 0, color: '#22c55e', icon: '⬇️' },
          { label: 'Cash Out', val: summary.cashOut || 0, color: '#ef4444', icon: '⬆️' },
          { label: 'Net Balance', val: (summary.cashIn || 0) - (summary.cashOut || 0), color: '#3b82f6', icon: '💰' },
          { label: 'Entries', val: txns.length, color: '#a855f7', icon: '📋', noRupee: true },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 130px', background: 'var(--clr-surface)', border: `1px solid ${s.color}33`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>
              {s.noRupee ? s.val : `₹${Math.abs(s.val).toLocaleString('en-IN')}`}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', marginTop: 2 }}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--clr-border)', marginBottom: 16 }}>
        {[
          { key: 'all', label: '📋 All Transactions' },
          { key: 'cash', label: '💵 Cash Transactions' },
          { key: 'advance', label: '💳 Advance Payments' },
          { key: 'history', label: '🕐 Payment History' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '9px 18px', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === tab.key ? '2px solid var(--clr-primary)' : '2px solid transparent',
            background: 'transparent', color: activeTab === tab.key ? 'var(--clr-primary)' : 'var(--clr-text3)',
            fontWeight: activeTab === tab.key ? 700 : 400, fontSize: '0.84rem',
          }}>{tab.label} ({tabFiltered[tab.key]?.length || 0})</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select className="form-select" value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))} style={{ maxWidth: 180 }}>
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="form-select" value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} style={{ maxWidth: 160 }}>
          <option value="">All Modes</option>
          {['cash','bank','upi','cheque','neft','rtgs'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
        <select className="form-select" value={filter.site} onChange={e => setFilter(f => ({ ...f, site: e.target.value }))} style={{ maxWidth: 180 }}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> :
        visible.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem' }}>💳</div>
            <p>No transactions found. Add the first transaction.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Txn No</th><th>Date</th><th>Type</th><th>Party</th>
                  <th>Mode</th><th>Reference</th><th>Amount (₹)</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(t => {
                  const meta = TYPE_META[t.type] || {};
                  const isIn = ['receipt', 'advance_received'].includes(t.type);
                  return (
                    <tr key={t._id}>
                      <td><span className="badge badge-gray">{t.transactionNumber}</span></td>
                      <td>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td>{t.partyName || t.party?.name || '—'}</td>
                      <td><span className="badge badge-gray">{(t.category || '').toUpperCase()}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{t.referenceNo || '—'}</td>
                      <td style={{ fontWeight: 700, color: isIn ? '#22c55e' : '#ef4444' }}>
                        {isIn ? '+' : '-'}₹{(t.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td><span className={`badge ${t.status === 'cleared' ? 'badge-green' : t.status === 'bounced' ? 'badge-red' : 'badge-gray'}`}>{t.status}</span></td>
                      <td>
                        <div className="action-btns">
                          {can('canDeleteFinancial') && (
                            <button className="btn-icon btn-danger" onClick={() => handleDelete(t._id)}>🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Create Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Add Transaction</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['cash','bank','upi','cheque','neft','rtgs','other'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Party Type</label>
                <select className="form-select" value={form.partyType} onChange={e => setForm(f => ({ ...f, partyType: e.target.value }))}>
                  {['customer','supplier','vendor','driver','other'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Company</label>
                <select className="form-select" value={form.party} onChange={e => {
                  const c = companies.find(c => c._id === e.target.value);
                  setForm(f => ({ ...f, party: e.target.value, partyName: c?.name || '' }));
                }}>
                  <option value="">Select...</option>
                  {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Party Name (manual)</label>
                <input {...inp('partyName')} placeholder="Override or enter party name" />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input type="number" {...inp('amount')} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" {...inp('date')} />
              </div>
              <div className="form-group">
                <label className="form-label">Reference No.</label>
                <input {...inp('referenceNo')} placeholder="UTR / Cheque / UPI ref" />
              </div>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input {...inp('bankName')} placeholder="Bank name" />
              </div>
              <div className="form-group">
                <label className="form-label">Site</label>
                <select className="form-select" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))}>
                  <option value="">All Sites</option>
                  {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description</label>
                <input {...inp('description')} placeholder="Brief description of transaction" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Notes</label>
                <textarea {...inp('notes')} rows={2} className="form-input" placeholder="Additional notes..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--clr-border)' }}>
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
