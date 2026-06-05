import './Companies.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/helpers';

const TYPE_COLORS = { supplier:'#f59e0b', customer:'#3b82f6', vendor:'#a855f7', both:'#22c55e' };
const TYPE_LABELS = { supplier:'Supplier', customer:'Customer', vendor:'Vendor', both:'Supplier+Customer' };

const EMPTY_FORM = {
  name:'', type:'customer', contactPerson:'', phone:'', altPhone:'', email:'',
  address:'', city:'', state:'Andhra Pradesh', pincode:'',
  gstin:'', pan:'', tdsApplicable:false, tdsPercent:1,
  bankName:'', accountNumber:'', ifscCode:'', branchName:'',
  creditDays:30, creditLimit:0, openingBalance:0, openingBalanceType:'debit',
  notes:'',
};

export default function CompaniesPage() {
  const { can } = useAuth();
  const [companies, setCompanies]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeTab, setActiveTab]   = useState('info');
  const searchTimer                 = useRef(null);

  const fetchCompanies = useCallback(async (searchVal = search) => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (searchVal) params.search = searchVal;
      const r = await api.get('/companies', { params });
      setCompanies(r.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [typeFilter, search]);

  useEffect(() => { fetchCompanies(); }, [typeFilter]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchCompanies(val), 400);
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setActiveTab('info'); setModal(true); setError(''); };
  const openEdit   = (c) => {
    setEditing(c);
    setForm({
      name:c.name||'', type:c.type||'customer', contactPerson:c.contactPerson||'',
      phone:c.phone||'', altPhone:c.altPhone||'', email:c.email||'',
      address:c.address||'', city:c.city||'', state:c.state||'Andhra Pradesh', pincode:c.pincode||'',
      gstin:c.gstin||'', pan:c.pan||'', tdsApplicable:!!c.tdsApplicable, tdsPercent:c.tdsPercent||1,
      bankName:c.bankName||'', accountNumber:c.accountNumber||'', ifscCode:c.ifscCode||'', branchName:c.branchName||'',
      creditDays:c.creditDays||30, creditLimit:c.creditLimit||0,
      openingBalance:c.openingBalance||0, openingBalanceType:c.openingBalanceType||'debit',
      notes:c.notes||'',
    });
    setActiveTab('info'); setModal(true); setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/companies/${editing._id}`, form);
      else await api.post('/companies', form);
      setModal(false); fetchCompanies();
    } catch (err) { setError(err.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this company?')) return;
    await api.delete(`/companies/${id}`);
    fetchCompanies();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const TABS = [
    { key:'info',    label:'📋 Info' },
    { key:'finance', label:'💰 Finance' },
    { key:'bank',    label:'🏦 Bank' },
  ];

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">🏢 Companies</h2>
          <p className="page-subtitle">{companies.length} companies</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Company</button>
      </div>

      {/* Search + Type Filter */}
      <div className="card" style={{ padding:'var(--sp-4)' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input className="form-control" style={{ flex:1, minWidth:200 }}
            placeholder="🔍 Search name, GSTIN, phone, city…"
            value={search} onChange={e => handleSearchChange(e.target.value)} />
          {['','customer','supplier','vendor','both'].map(t => (
            <button key={t} className={`btn btn-xs ${typeFilter === t ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTypeFilter(t)}>
              {t === '' ? 'All' : TYPE_LABELS[t] || t}
            </button>
          ))}
          <button className="btn btn-outline" onClick={() => { setSearch(''); setTypeFilter(''); fetchCompanies(''); }}>
            ✕ Reset
          </button>
        </div>
      </div>

      {/* Grid Cards */}
      {loading ? (
        <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
      ) : companies.length === 0 ? (
        <div className="empty-state"><div style={{ fontSize:'2.5rem' }}>🏢</div><p>No companies found</p></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'var(--sp-4)' }}>
          {companies.map(c => (
            <div key={c._id} className="card" style={{ padding:'var(--sp-4)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: TYPE_COLORS[c.type] || '#dde3f0' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--clr-text1)', lineHeight:1.2 }}>{c.name}</div>
                  <span style={{ fontSize:'0.72rem', fontWeight:700, color: TYPE_COLORS[c.type], textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    {TYPE_LABELS[c.type] || c.type}
                  </span>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <button className="btn btn-xs btn-outline" onClick={() => openEdit(c)}>✏️</button>
                  <button className="btn btn-xs btn-danger" onClick={() => handleDelete(c._id)}>🗑️</button>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:3, fontSize:'0.8rem', color:'var(--clr-text3)' }}>
                {c.contactPerson && <span>👤 {c.contactPerson}</span>}
                {c.phone && <span>📞 {c.phone}</span>}
                {c.city && <span>📍 {c.city}, {c.state}</span>}
                {c.gstin && <span>🧾 {c.gstin}</span>}
              </div>
              {(c.openingBalance > 0) && (
                <div style={{ marginTop:10, padding:'6px 10px', background: c.openingBalanceType === 'credit' ? '#f0fdf4' : '#fef2f2', borderRadius:6, fontSize:'0.78rem', fontWeight:700, color: c.openingBalanceType === 'credit' ? '#16a34a' : '#dc2626' }}>
                  Opening: {formatCurrency(c.openingBalance)} ({c.openingBalanceType})
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? `Edit — ${editing.name}` : 'Add Company'}>
        {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:'var(--sp-4)', borderBottom:'2px solid #f1f5f9', paddingBottom:8 }}>
          {TABS.map(t => (
            <button key={t.key} type="button"
              className={`btn btn-xs ${activeTab === t.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab(t.key)}>{t.label}</button>
          ))}
        </div>

        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'var(--sp-3)' }}>

          {/* Info Tab */}
          {activeTab === 'info' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input className="form-control" required value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="form-control" required value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="vendor">Vendor</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input className="form-control" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Alternate Phone</label>
                  <input className="form-control" value={form.altPhone} onChange={e => set('altPhone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-control" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-control" value={form.state} onChange={e => set('state', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-control" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input className="form-control" value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN</label>
                  <input className="form-control" value={form.pan} onChange={e => set('pan', e.target.value.toUpperCase())} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </>
          )}

          {/* Finance Tab */}
          {activeTab === 'finance' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Credit Days</label>
                  <input type="number" className="form-control" value={form.creditDays} onChange={e => set('creditDays', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Limit (₹)</label>
                  <input type="number" className="form-control" value={form.creditLimit} onChange={e => set('creditLimit', e.target.value)} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Opening Balance (₹)</label>
                  <input type="number" className="form-control" value={form.openingBalance} onChange={e => set('openingBalance', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Balance Type</label>
                  <select className="form-control" value={form.openingBalanceType} onChange={e => set('openingBalanceType', e.target.value)}>
                    <option value="debit">Debit (they owe us)</option>
                    <option value="credit">Credit (we owe them)</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group" style={{ display:'flex', alignItems:'center', gap:10, marginTop:20 }}>
                  <input type="checkbox" id="tdsApp" checked={form.tdsApplicable} onChange={e => set('tdsApplicable', e.target.checked)} style={{ width:18, height:18 }} />
                  <label htmlFor="tdsApp" className="form-label" style={{ marginBottom:0 }}>TDS Applicable</label>
                </div>
                {form.tdsApplicable && (
                  <div className="form-group">
                    <label className="form-label">TDS %</label>
                    <input type="number" step="0.01" className="form-control" value={form.tdsPercent} onChange={e => set('tdsPercent', e.target.value)} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Bank Tab */}
          {activeTab === 'bank' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input className="form-control" value={form.bankName} onChange={e => set('bankName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input className="form-control" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">IFSC Code</label>
                <input className="form-control" value={form.ifscCode} onChange={e => set('ifscCode', e.target.value.toUpperCase())} />
              </div>
              <div className="form-group">
                <label className="form-label">Branch Name</label>
                <input className="form-control" value={form.branchName} onChange={e => set('branchName', e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" className="btn btn-outline" onClick={() => setForm(EMPTY_FORM)}>🔄 Reset</button>
            <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
