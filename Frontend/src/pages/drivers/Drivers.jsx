import './Drivers.css';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_COLORS = {
  active: '#22c55e',
  inactive: '#6b7280',
  on_leave: '#f59e0b',
  terminated: '#ef4444',
};

const EMPTY_FORM = {
  name: '', phone: '', altPhone: '', address: '',
  licenseNumber: '', licenseType: 'HMV', licenseExpiry: '', licenseState: '',
  assignedVehicle: '', assignedSites: [],
  joiningDate: '', salaryType: 'monthly', salary: '',
  emergencyContact: '', emergencyPhone: '',
  aadharNumber: '', status: 'active',
};

export default function DriversPage() {
  const { can } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = () => {
    setLoading(true);
    Promise.all([
      api.get('/drivers'),
      api.get('/vehicles'),
      api.get('/sites'),
    ]).then(([d, v, s]) => {
      setDrivers(d.data.data || []);
      setVehicles(v.data.data || []);
      setSites(s.data.data || []);
    }).catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal(true);
    setError('');
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.name || '', phone: d.phone || '', altPhone: d.altPhone || '',
      address: d.address || '', licenseNumber: d.licenseNumber || '',
      licenseType: d.licenseType || 'HMV',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
      licenseState: d.licenseState || '',
      assignedVehicle: d.assignedVehicle?._id || d.assignedVehicle || '',
      assignedSites: (d.assignedSites || []).map(s => s._id || s),
      joiningDate: d.joiningDate ? d.joiningDate.slice(0, 10) : '',
      salaryType: d.salaryType || 'monthly', salary: d.salary || '',
      emergencyContact: d.emergencyContact || '', emergencyPhone: d.emergencyPhone || '',
      aadharNumber: d.aadharNumber || '', status: d.status || 'active',
    });
    setModal(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.assignedVehicle) delete payload.assignedVehicle;
      if (editing) {
        await api.put(`/drivers/${editing._id}`, payload);
      } else {
        await api.post('/drivers', payload);
      }
      setModal(false);
      fetch();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this driver?')) return;
    try { await api.delete(`/drivers/${id}`); fetch(); }
    catch (e) { alert(e.response?.data?.message || 'Delete failed'); }
  };

  const handleStatusChange = async (id, status) => {
    try { await api.patch(`/drivers/${id}/status`, { status }); fetch(); }
    catch { alert('Status update failed'); }
  };

  const inp = (field) => ({
    value: form[field] || '',
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    className: 'form-input',
  });

  const checkLicenseExpiry = (expiry) => {
    if (!expiry) return null;
    const days = Math.ceil((new Date(expiry) - new Date()) / (1000 * 86400));
    if (days < 0) return { label: 'Expired', color: '#ef4444' };
    if (days <= 30) return { label: `Expiring in ${days}d`, color: '#f59e0b' };
    return null;
  };

  const filtered = drivers.filter(d =>
    (!statusFilter || d.status === statusFilter) &&
    (!search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      (d.driverCode || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Driver Management</h1>
          <p className="page-subtitle">{drivers.length} drivers registered</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Driver</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['active', 'inactive', 'on_leave', 'terminated'].map(s => {
          const count = drivers.filter(d => d.status === s).length;
          return (
            <div key={s} style={{
              padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === s ? STATUS_COLORS[s] + '22' : 'var(--clr-surface)',
              border: `1px solid ${statusFilter === s ? STATUS_COLORS[s] : 'var(--clr-border)'}`,
              color: STATUS_COLORS[s], fontWeight: 600,
            }} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
              {count} {s.replace('_', ' ')}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input className="form-input" placeholder="Search name, phone, code..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '300px' }} />
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> :
        filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem' }}>🚛</div>
            <p>No drivers found. Add your first driver.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>License</th>
                  <th>Expiry</th>
                  <th>Vehicle</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const expWarn = checkLicenseExpiry(d.licenseExpiry);
                  return (
                    <tr key={d._id}>
                      <td><span className="badge badge-gray">{d.driverCode}</span></td>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>{d.phone}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{d.licenseNumber || '—'}</td>
                      <td>
                        {d.licenseExpiry ? (
                          <span style={{ color: expWarn ? expWarn.color : 'var(--clr-text)' }}>
                            {new Date(d.licenseExpiry).toLocaleDateString('en-IN')}
                            {expWarn && <span style={{ marginLeft: '4px', fontSize: '0.75rem' }}>({expWarn.label})</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{d.assignedVehicle?.vehicleNumber || '—'}</td>
                      <td>₹{(d.salary || 0).toLocaleString('en-IN')}/{d.salaryType === 'monthly' ? 'mo' : d.salaryType}</td>
                      <td>
                        <select value={d.status} onChange={e => handleStatusChange(d._id, e.target.value)}
                          style={{
                            padding: '3px 8px', borderRadius: '12px', border: '1px solid',
                            background: STATUS_COLORS[d.status] + '22',
                            color: STATUS_COLORS[d.status],
                            borderColor: STATUS_COLORS[d.status] + '55',
                            fontSize: '0.8rem', cursor: 'pointer',
                          }}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="on_leave">On Leave</option>
                          <option value="terminated">Terminated</option>
                        </select>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => openEdit(d)}>✏️</button>
                          {can('canDeleteFinancial') && (
                            <button className="btn-icon btn-danger" onClick={() => handleDelete(d._id)}>🗑️</button>
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

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: '620px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Driver' : 'Add Driver'}</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Full Name *</label>
                <input {...inp('name')} placeholder="Driver full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input {...inp('phone')} placeholder="Mobile number" />
              </div>
              <div className="form-group">
                <label className="form-label">Alt Phone</label>
                <input {...inp('altPhone')} />
              </div>
              <div className="form-group">
                <label className="form-label">License Number</label>
                <input {...inp('licenseNumber')} />
              </div>
              <div className="form-group">
                <label className="form-label">License Type</label>
                <select className="form-select" value={form.licenseType}
                  onChange={e => setForm(f => ({ ...f, licenseType: e.target.value }))}>
                  {['LMV','HMV','HGMV','HTV','MGV','Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">License Expiry</label>
                <input type="date" {...inp('licenseExpiry')} />
              </div>
              <div className="form-group">
                <label className="form-label">License State</label>
                <input {...inp('licenseState')} placeholder="e.g. Andhra Pradesh" />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Vehicle</label>
                <select className="form-select" value={form.assignedVehicle}
                  onChange={e => setForm(f => ({ ...f, assignedVehicle: e.target.value }))}>
                  <option value="">None</option>
                  {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber} — {v.vehicleType}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Joining Date</label>
                <input type="date" {...inp('joiningDate')} />
              </div>
              <div className="form-group">
                <label className="form-label">Salary Type</label>
                <select className="form-select" value={form.salaryType}
                  onChange={e => setForm(f => ({ ...f, salaryType: e.target.value }))}>
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                  <option value="trip">Per Trip</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Salary (₹)</label>
                <input type="number" {...inp('salary')} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input {...inp('emergencyContact')} placeholder="Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Phone</label>
                <input {...inp('emergencyPhone')} />
              </div>
              <div className="form-group">
                <label className="form-label">Aadhar Number</label>
                <input {...inp('aadharNumber')} placeholder="XXXX XXXX XXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Address</label>
                <textarea {...inp('address')} rows={2} className="form-input" placeholder="Full address" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--clr-border)' }}>
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
