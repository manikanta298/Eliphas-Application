import './Companies.css';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_COLORS = {
  supplier: '#f59e0b',
  customer: '#3b82f6',
  vendor: '#a855f7',
  both: '#22c55e',
};

const TYPE_LABELS = {
  supplier: 'Supplier',
  customer: 'Customer',
  vendor: 'Vendor',
  both: 'Supplier+Customer',
};

const EMPTY_FORM = {
  name: '', type: 'customer', contactPerson: '', phone: '', altPhone: '', email: '',
  address: '', city: '', state: 'Andhra Pradesh', pincode: '',
  gstin: '', pan: '', tdsApplicable: false, tdsPercent: 1,
  bankName: '', accountNumber: '', ifscCode: '', branchName: '',
  creditDays: 30, creditLimit: 0, openingBalance: 0, openingBalanceType: 'debit',
  notes: '',
};

export default function CompaniesPage() {
  const { can } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ type: '', search: '' });
  const [activeTab, setActiveTab] = useState('info');

  const fetchCompanies = () => {
    setLoading(true);
    const params = {};
    if (filter.type) params.type = filter.type;
    api.get('/companies', { params })
      .then(r => setCompanies(r.data.data || []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCompanies(); }, [filter.type]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setActiveTab('info');
    setModal(true);
    setError('');
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '', type: c.type || 'customer',
      contactPerson: c.contactPerson || '', phone: c.phone || '',
      altPhone: c.altPhone || '', email: c.email || '',
      address: c.address || '', city: c.city || '',
      state: c.state || 'Andhra Pradesh', pincode: c.pincode || '',
      gstin: c.gstin || '', pan: c.pan || '',
      tdsApplicable: c.tdsApplicable || false, tdsPercent: c.tdsPercent || 1,
      bankName: c.bankName || '', accountNumber: c.accountNumber || '',
      ifscCode: c.ifscCode || '', branchName: c.branchName || '',
      creditDays: c.creditDays || 30, creditLimit: c.creditLimit || 0,
      openingBalance: c.openingBalance || 0, openingBalanceType: c.openingBalanceType || 'debit',
      notes: c.notes || '',
    });
    setActiveTab('info');
    setModal(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Company name and phone are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/companies/${editing._id}`, form);
      } else {
        await api.post('/companies', form);
      }
      setModal(false);
      fetchCompanies();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this company? This action cannot be undone.')) return;
    try {
      await api.delete(`/companies/${id}`);
      fetchCompanies();
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/companies/${id}/toggle-status`);
      fetchCompanies();
    } catch (e) {
      alert('Failed to toggle status');
    }
  };

  const filtered = companies.filter(c =>
    !filter.search ||
    c.name.toLowerCase().includes(filter.search.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(filter.search.toLowerCase()) ||
    (c.phone || '').includes(filter.search)
  );

  const inp = (field) => ({
    value: form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    className: 'form-input',
  });

  const summary = {
    all: companies.length,
    supplier: companies.filter(c => c.type === 'supplier' || c.type === 'both').length,
    customer: companies.filter(c => c.type === 'customer' || c.type === 'both').length,
    vendor: companies.filter(c => c.type === 'vendor').length,
  };

  return (
    <div className="page animate-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Management</h1>
          <p className="page-subtitle">Manage suppliers, customers &amp; vendors</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Company</button>
      </div>

      {/* Summary Cards */}
      <div className="stats-row" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Companies', val: summary.all, color: '#3b82f6' },
          { label: 'Suppliers', val: summary.supplier, color: '#f59e0b' },
          { label: 'Customers', val: summary.customer, color: '#22c55e' },
          { label: 'Vendors', val: summary.vendor, color: '#a855f7' },
        ].map(s => (
          <div key={s.label} className="stat-mini" style={{ flex: '1 1 120px', background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '14px 18px' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text3)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="form-input"
          placeholder="Search name, code, phone..."
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          style={{ flex: '1 1 200px', maxWidth: '300px' }}
        />
        <select className="form-select" value={filter.type}
          onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          <option value="supplier">Suppliers</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendors</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem' }}>🏢</div>
          <p>No companies found. Add your first company.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Company Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>Credit Days</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c._id} style={{ opacity: c.isActive ? 1 : 0.6 }}>
                  <td><span className="badge badge-gray">{c.code}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <span className="badge" style={{
                      background: `${TYPE_COLORS[c.type]}22`,
                      color: TYPE_COLORS[c.type],
                      border: `1px solid ${TYPE_COLORS[c.type]}44`,
                      padding: '2px 10px', borderRadius: '20px', fontSize: '0.78rem'
                    }}>
                      {TYPE_LABELS[c.type]}
                    </span>
                  </td>
                  <td>{c.contactPerson || '—'}</td>
                  <td>{c.phone}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{c.gstin || '—'}</td>
                  <td>{c.creditDays} days</td>
                  <td>
                    <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}>✏️</button>
                      <button className="btn-icon" title={c.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggle(c._id)}>
                        {c.isActive ? '🔴' : '🟢'}
                      </button>
                      {can('canDeleteFinancial') && (
                        <button className="btn-icon btn-danger" title="Delete"
                          onClick={() => handleDelete(c._id)}>🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Company' : 'Add Company'}</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--clr-border)', marginBottom: '20px' }}>
              {['info', 'tax', 'bank'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px', border: 'none', cursor: 'pointer',
                    background: activeTab === tab ? 'var(--clr-primary)' : 'transparent',
                    color: activeTab === tab ? '#fff' : 'var(--clr-text2)',
                    fontWeight: activeTab === tab ? 600 : 400,
                    borderBottom: activeTab === tab ? '2px solid var(--clr-primary)' : 'none',
                    textTransform: 'capitalize',
                  }}>
                  {tab === 'info' ? '📋 Basic Info' : tab === 'tax' ? '🧾 GST / Tax' : '🏦 Bank Details'}
                </button>
              ))}
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>}

            {activeTab === 'info' && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Company Name *</label>
                  <input {...inp('name')} placeholder="e.g. Vizag Steel Plant" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="form-select" value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                    <option value="vendor">Vendor</option>
                    <option value="both">Supplier + Customer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input {...inp('contactPerson')} placeholder="Name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input {...inp('phone')} placeholder="Mobile number" />
                </div>
                <div className="form-group">
                  <label className="form-label">Alt Phone</label>
                  <input {...inp('altPhone')} placeholder="Alternate phone" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Email</label>
                  <input {...inp('email')} placeholder="email@company.com" type="email" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Address</label>
                  <textarea {...inp('address')} rows={2} placeholder="Full address" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input {...inp('city')} placeholder="City" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input {...inp('state')} placeholder="State" />
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Days</label>
                  <input type="number" {...inp('creditDays')} placeholder="30" />
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Limit (₹)</label>
                  <input type="number" {...inp('creditLimit')} placeholder="0" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Notes</label>
                  <textarea {...inp('notes')} rows={2} placeholder="Any notes..." className="form-input" />
                </div>
              </div>
            )}

            {activeTab === 'tax' && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input {...inp('gstin')} placeholder="22AAAAA0000A1Z5" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN</label>
                  <input {...inp('pan')} placeholder="AAAAA0000A" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">TDS Applicable?</label>
                  <select className="form-select" value={form.tdsApplicable}
                    onChange={e => setForm(f => ({ ...f, tdsApplicable: e.target.value === 'true' }))}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">TDS %</label>
                  <input type="number" {...inp('tdsPercent')} disabled={!form.tdsApplicable} />
                </div>
                <div className="form-group">
                  <label className="form-label">Opening Balance (₹)</label>
                  <input type="number" {...inp('openingBalance')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Balance Type</label>
                  <select className="form-select" value={form.openingBalanceType}
                    onChange={e => setForm(f => ({ ...f, openingBalanceType: e.target.value }))}>
                    <option value="debit">Debit (They owe us)</option>
                    <option value="credit">Credit (We owe them)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input {...inp('bankName')} placeholder="e.g. SBI" />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input {...inp('accountNumber')} placeholder="Account number" />
                </div>
                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input {...inp('ifscCode')} placeholder="SBIN0001234" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input {...inp('branchName')} placeholder="Branch name" />
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--clr-border)' }}>
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Company' : 'Add Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
