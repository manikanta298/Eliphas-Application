import './Vehicles.css';
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/helpers';
import { useSite } from '../../contexts/SiteContext';

const VEHICLE_TYPES = ['Lorry','Truck','Tipper','Trailer','JCB','Crane','Machinery','Other'];

const emptyForm = {
  vehicleNumber: '', vehicleType: 'Tipper', ownership: 'own',
  ownerName: '', model: '', year: '', rcNumber: '',
  driverLicense: '', fitnessCertNo: '', permitNo: '',
  driverName: '', driverPhone: '',
  capacity: '', fuelType: 'Diesel',
  presentDieselReading: '', entryDate: '', exitDate: '',
  status: 'active',};

const STATUS_COLOR = { active: '#16a34a', inactive: '#64748b', maintenance: '#f59e0b', on_trip: '#2563eb' };

export default function VehiclesPage() {
  const { selectedSite } = useSite();
  const siteId = selectedSite?._id || '';
  const [vehicles, setVehicles] = useState([]);
  const [modal, setModal]       = useState(false);
  const [editItem, setEdit]     = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [search, setSearch]     = useState('');
  const [filters, setFilters]   = useState({ ownership: '' });
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState('basic');

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/vehicles', { params: { ...filters, site: siteId || undefined, search: search || undefined } });
      setVehicles(r.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters, search, siteId]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const openAdd  = () => { setForm(emptyForm); setEdit(null); setTab('basic'); setModal(true); };
  const openEdit = (v) => {
    setEdit(v);
    setTab('basic');
    setForm({
      vehicleNumber: v.vehicleNumber, vehicleType: v.vehicleType, ownership: v.ownership,
      ownerName: v.ownerName || '', model: v.model || '', year: v.year || '',
      rcNumber: v.rcNumber || '', driverLicense: v.driverLicense || '',
      fitnessCertNo: v.fitnessCertNo || '', permitNo: v.permitNo || '',
      driverName: v.driverName || '', driverPhone: v.driverPhone || '',
      capacity: v.capacity || '', fuelType: v.fuelType || 'Diesel',
      presentDieselReading: v.presentDieselReading || '',
      entryDate: v.entryDate?.split('T')[0] || '',
      exitDate: v.exitDate?.split('T')[0] || '',
      status: v.status,
    });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.entryDate) delete payload.entryDate;
      if (!payload.exitDate) delete payload.exitDate;
      if (editItem) await api.put(`/vehicles/${editItem._id}`, payload);
      else await api.post('/vehicles', payload);
      setModal(false); fetchVehicles();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete vehicle?')) return;
    await api.delete(`/vehicles/${id}`); fetchVehicles();
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const TABS = [
    { key:'basic',  label:'📋 Basic Info' },
    { key:'docs',   label:'📄 Documents' },
    { key:'driver', label:'👤 Driver' },
  ];

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
      <div className="page-header">
        <div><h2 className="page-title">🚛 Vehicles</h2><p className="page-subtitle">Fleet management — {vehicles.length} vehicles</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Vehicle</button>
      </div>

      {/* Search + Filters */}
      <div className="card" style={{ padding:'var(--sp-4)' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input className="form-control" style={{ flex:1, minWidth:200 }} placeholder="🔍 Search vehicle #, owner, driver…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-control" style={{ width:150 }} value={filters.ownership}
            onChange={e => setFilters(f => ({ ...f, ownership: e.target.value }))}>
            <option value="">All Ownership</option>
            <option value="own">Own</option>
            <option value="vendor">Vendor</option>
          </select>
          <button className="btn btn-outline" onClick={() => { setSearch(''); setFilters({ ownership:'' }); }}>
            ✕ Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state"><div style={{ fontSize:'2.5rem' }}>🚛</div><p>No vehicles found</p></div>
        ) : (
          <div className="vehicles-table" style={{ overflowX:'auto' }}>            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle #</th><th>Type</th><th>Owner</th><th>Driver</th>
                  <th>RC #</th><th>DL #</th><th>Fitness</th><th>Permit</th>
                  <th>Diesel Reading</th><th>Entry Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v._id}>
                    <td><strong>{v.vehicleNumber}</strong></td>
                    <td><span className="badge badge-gray">{v.vehicleType}</span></td>
                    <td>{v.ownerName || '—'}</td>
                    <td>{v.driverName || '—'}</td>
                    <td style={{ fontSize:'0.78rem' }}>{v.rcNumber || '—'}</td>
                    <td style={{ fontSize:'0.78rem' }}>{v.driverLicense || '—'}</td>
                    <td style={{ fontSize:'0.78rem' }}>{v.fitnessCertNo || '—'}</td>
                    <td style={{ fontSize:'0.78rem' }}>{v.permitNo || '—'}</td>
                    <td>{v.presentDieselReading != null ? `${v.presentDieselReading} L` : '—'}</td>
                    <td style={{ fontSize:'0.78rem' }}>{v.entryDate ? formatDate(v.entryDate) : '—'}</td>
                    <td>
                      <button className="btn btn-xs btn-outline" onClick={() => openEdit(v)}>✏️</button>
                      <button className="btn btn-xs btn-danger" style={{ marginLeft:4 }} onClick={() => handleDelete(v._id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? `Edit — ${editItem.vehicleNumber}` : 'Add Vehicle'}>
        {/* Tab Nav */}
        <div style={{ display:'flex', gap:4, marginBottom:'var(--sp-4)', borderBottom:'2px solid #f1f5f9', paddingBottom:8 }}>
          {TABS.map(t => (
            <button key={t.key} type="button"
              className={`btn btn-xs ${tab === t.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'var(--sp-4)' }}>

          {/* Tab: Basic */}
          {tab === 'basic' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Vehicle Number *</label>
                  <input className="form-control" required value={form.vehicleNumber} onChange={e => f('vehicleNumber', e.target.value.toUpperCase())} placeholder="AP09AB1234" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type *</label>
                  <select className="form-control" required value={form.vehicleType} onChange={e => f('vehicleType', e.target.value)}>
                    {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Ownership *</label>
                  <select className="form-control" required value={form.ownership} onChange={e => f('ownership', e.target.value)}>
                    <option value="own">Own</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-control" value={form.ownerName} onChange={e => f('ownerName', e.target.value)} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input className="form-control" value={form.model} onChange={e => f('model', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input type="number" className="form-control" value={form.year} onChange={e => f('year', e.target.value)} min="1990" max="2030" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fuel Type</label>
                  <select className="form-control" value={form.fuelType} onChange={e => f('fuelType', e.target.value)}>
                    {['Diesel','Petrol','CNG','Electric'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Capacity (Ton)</label>
                  <input type="number" step="0.1" className="form-control" value={form.capacity} onChange={e => f('capacity', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Present Diesel Reading (L)</label>
                  <input type="number" step="0.01" className="form-control" value={form.presentDieselReading} onChange={e => f('presentDieselReading', e.target.value)} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <div className="form-group">
                  <label className="form-label">Entry Date</label>
                  <input type="date" className="form-control" value={form.entryDate} onChange={e => f('entryDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Exit Date</label>
                  <input type="date" className="form-control" value={form.exitDate} onChange={e => f('exitDate', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => f('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="on_trip">On Trip</option>
                </select>
              </div>
            </>
          )}

          {/* Tab: Documents */}
          {tab === 'docs' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
              <div className="form-group">
                <label className="form-label">RC Number</label>
                <input className="form-control" value={form.rcNumber} onChange={e => f('rcNumber', e.target.value)} placeholder="Registration Certificate #" />
              </div>
              <div className="form-group">
                <label className="form-label">Driver License Number</label>
                <input className="form-control" value={form.driverLicense} onChange={e => f('driverLicense', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Fitness Certificate #</label>
                <input className="form-control" value={form.fitnessCertNo} onChange={e => f('fitnessCertNo', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Permit Number</label>
                <input className="form-control" value={form.permitNo} onChange={e => f('permitNo', e.target.value)} />
              </div>
            </div>
          )}

          {/* Tab: Driver */}
          {tab === 'driver' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
              <div className="form-group">
                <label className="form-label">Driver Name</label>
                <input className="form-control" value={form.driverName} onChange={e => f('driverName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Driver Phone</label>
                <input className="form-control" value={form.driverPhone} onChange={e => f('driverPhone', e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" className="btn btn-outline" onClick={() => setForm(emptyForm)}>🔄 Reset</button>
            <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Save Vehicle'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
