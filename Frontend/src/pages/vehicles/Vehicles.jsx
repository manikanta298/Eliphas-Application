import './Vehicles.css';
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { statusClass, formatCurrency } from '../../utils/helpers';

const VEHICLE_TYPES = ['Lorry','Truck','Tipper','Trailer','JCB','Crane','Machinery','Other'];
const emptyForm = { vehicleNumber:'', vehicleType:'Tipper', ownership:'own', driverName:'', driverPhone:'', driverLicense:'', make:'', model:'', year:'', capacity:'', fuelType:'Diesel', tripRate:'', tonRate:'', kmRate:'', hourlyRate:'', dailyRate:'', monthlyRate:'', status:'active' };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [sites, setSites]       = useState([]);
  const [modal, setModal]       = useState(false);
  const [editItem, setEdit]     = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [filters, setFilters]   = useState({ ownership:'', status:'', site:'' });
  const [loading, setLoading]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const r = await api.get('/vehicles', { params: filters });
    setVehicles(r.data.data);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { api.get('/sites').then(r=>setSites(r.data.data)); }, []);

  const openAdd  = () => { setForm(emptyForm); setEdit(null); setModal(true); };
  const openEdit = (v) => { setEdit(v); setForm({ vehicleNumber:v.vehicleNumber, vehicleType:v.vehicleType, ownership:v.ownership, driverName:v.driverName||'', driverPhone:v.driverPhone||'', driverLicense:v.driverLicense||'', make:v.make||'', model:v.model||'', year:v.year||'', capacity:v.capacity||'', fuelType:v.fuelType||'Diesel', tripRate:v.tripRate||'', tonRate:v.tonRate||'', kmRate:v.kmRate||'', hourlyRate:v.hourlyRate||'', dailyRate:v.dailyRate||'', monthlyRate:v.monthlyRate||'', status:v.status }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) await api.put(`/vehicles/${editItem._id}`, form);
      else await api.post('/vehicles', form);
      setModal(false); fetch();
    } catch (err) { alert(err.response?.data?.message||'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete vehicle?')) return;
    await api.delete(`/vehicles/${id}`); fetch();
  };

  const statusColors = { active:'var(--clr-success)', inactive:'var(--clr-text3)', maintenance:'var(--clr-warning)', on_trip:'var(--clr-accent)' };

  return (
    <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
      <div className="page-header">
        <div><h2 className="page-title">🚛 Vehicle Management</h2><p className="page-subtitle">Manage your fleet — own and vendor vehicles</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Vehicle</button>
      </div>

      <div className="filters-bar">
        <select className="form-control" value={filters.ownership} onChange={e=>setFilters({...filters,ownership:e.target.value})}>
          <option value="">All Ownership</option><option value="own">Own Vehicles</option><option value="vendor">Vendor Vehicles</option>
        </select>
        <select className="form-control" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>
          <option value="">All Status</option>
          {['active','inactive','maintenance','on_trip'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={()=>setFilters({ownership:'',status:'',site:''})}>✕</button>
      </div>

      <div style={{display:'flex',flexWrap:'wrap',gap:'var(--sp-4)'}}>
        {loading ? <div className="spinner spinner-lg" style={{margin:'60px auto'}}/> :
         vehicles.length===0 ? <div className="empty-state w-full"><div className="empty-state-icon">🚛</div><p>No vehicles found</p></div> :
         vehicles.map(v=>(
          <div key={v._id} className="card" style={{flex:'1 1 280px',minWidth:'260px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'var(--sp-3)'}}>
              <div>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.05rem',fontWeight:'800',letterSpacing:'0.05em'}}>{v.vehicleNumber}</h3>
                <p style={{fontSize:'0.75rem',color:'var(--clr-text3)'}}>{v.vehicleType} · {v.ownership==='own'?'Company':'Vendor'}</p>
              </div>
              <span className={`badge ${statusClass(v.status)}`}>{v.status.replace('_',' ')}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-2)',fontSize:'0.85rem',color:'var(--clr-text2)'}}>
              {v.driverName && <div>🧑‍✈️ <strong>{v.driverName}</strong> {v.driverPhone&&`· ${v.driverPhone}`}</div>}
              {v.capacity && <div>📦 Capacity: <strong>{v.capacity} Tons</strong></div>}
              <div style={{display:'flex',flexWrap:'wrap',gap:'var(--sp-2)',marginTop:'var(--sp-2)'}}>
                {v.tripRate>0 && <span className="badge badge-info">Trip: ₹{v.tripRate}</span>}
                {v.tonRate>0 && <span className="badge badge-accent">Ton: ₹{v.tonRate}</span>}
                {v.kmRate>0 && <span className="badge badge-neutral">KM: ₹{v.kmRate}</span>}
                {v.hourlyRate>0 && <span className="badge badge-warning">Hr: ₹{v.hourlyRate}</span>}
                {v.dailyRate>0 && <span className="badge badge-success">Day: ₹{v.dailyRate}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:'var(--sp-2)',marginTop:'var(--sp-4)'}}>
              <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(v)}>✏ Edit</button>
              <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(v._id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modal} onClose={()=>setModal(false)} title={editItem?'✏ Edit Vehicle':'🚛 Add Vehicle'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{editItem?'Update':'Save'}</button></>}
      >
        <form onSubmit={handleSubmit}>
          <p style={{fontSize:'0.8rem',fontWeight:'600',color:'var(--clr-text3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'var(--sp-3)'}}>Basic Details</p>
          <div className="form-grid" style={{marginBottom:'var(--sp-5)'}}>
            <div className="form-group"><label className="form-label">Vehicle Number *</label><input className="form-control" value={form.vehicleNumber} onChange={e=>setForm({...form,vehicleNumber:e.target.value.toUpperCase()})} required placeholder="AP05TC1234"/></div>
            <div className="form-group"><label className="form-label">Vehicle Type *</label>
              <select className="form-control" value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}>
                {VEHICLE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Ownership *</label>
              <select className="form-control" value={form.ownership} onChange={e=>setForm({...form,ownership:e.target.value})}>
                <option value="own">Own Vehicle</option><option value="vendor">Vendor Vehicle</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Capacity (Tons)</label><input type="number" className="form-control" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="15"/></div>
            <div className="form-group"><label className="form-label">Driver Name</label><input className="form-control" value={form.driverName} onChange={e=>setForm({...form,driverName:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Driver Phone</label><input type="tel" className="form-control" value={form.driverPhone} onChange={e=>setForm({...form,driverPhone:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {['active','inactive','maintenance','on_trip'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <p style={{fontSize:'0.8rem',fontWeight:'600',color:'var(--clr-text3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'var(--sp-3)'}}>Rates</p>
          <div className="form-grid">
            {[['tripRate','Trip Rate (₹)'],['tonRate','Per Ton Rate (₹)'],['kmRate','Per KM Rate (₹)'],['hourlyRate','Hourly Rate (₹)'],['dailyRate','Daily Rate (₹)'],['monthlyRate','Monthly Rate (₹)']].map(([k,l])=>(
              <div key={k} className="form-group"><label className="form-label">{l}</label><input type="number" step="0.01" className="form-control" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder="0"/></div>
            ))}
          </div>
        </form>
      </Modal>
    </div>
  );
}
