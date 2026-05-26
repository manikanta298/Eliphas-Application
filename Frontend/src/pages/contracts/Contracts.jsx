import './Contracts.css';
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatDate, formatCurrency, billingLabel, statusClass } from '../../utils/helpers';

const BILLING_TYPES = ['trip','ton','weight','km','hourly','daily','weekly','monthly','fixed','machineRental','custom'];
const emptyForm = { title:'', site:'', vehicle:'', product:'', billingType:'ton', rate:'', startDate:'', endDate:'', contractValue:'', gstPercent:18, tdsPercent:0, terms:'', status:'active' };

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [sites, setSites]         = useState([]);
  const [vehicles, setVehicles]   = useState([]);
  const [products, setProducts]   = useState([]);
  const [modal, setModal]         = useState(false);
  const [editItem, setEdit]       = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [loading, setLoading]     = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const r = await api.get('/contracts');
    setContracts(r.data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    api.get('/sites').then(r => setSites(r.data.data));
    api.get('/vehicles').then(r => setVehicles(r.data.data));
    api.get('/products').then(r => setProducts(r.data.data));
  }, [fetch]);

  const openAdd  = () => { setForm(emptyForm); setEdit(null); setModal(true); };
  const openEdit = (c) => {
    setEdit(c);
    setForm({ title:c.title, site:c.site?._id||c.site, vehicle:c.vehicle?._id||c.vehicle||'', product:c.product?._id||c.product||'', billingType:c.billingType, rate:c.rate, startDate:c.startDate?.split('T')[0]||'', endDate:c.endDate?.split('T')[0]||'', contractValue:c.contractValue||'', gstPercent:c.gstPercent, tdsPercent:c.tdsPercent, terms:c.terms||'', status:c.status });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) await api.put(`/contracts/${editItem._id}`, form);
      else await api.post('/contracts', form);
      setModal(false); fetch();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
      <div className="page-header">
        <div><h2 className="page-title">📋 Contracts</h2><p className="page-subtitle">Manage billing contracts and rate agreements</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Contract</button>
      </div>

      <div className="table-wrap">
        <table className="erp-table">
          <thead>
            <tr><th>Contract #</th><th>Title</th><th>Site</th><th>Billing Type</th><th>Rate</th><th>Start</th><th>End</th><th>Value</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{textAlign:'center',padding:'40px'}}><div className="spinner" style={{margin:'auto'}}/></td></tr>
            ) : contracts.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">📋</div><p>No contracts yet</p></div></td></tr>
            ) : contracts.map(c => (
              <tr key={c._id}>
                <td><strong style={{color:'var(--clr-accent)',fontFamily:'var(--font-display)',fontSize:'0.8rem'}}>{c.contractNumber}</strong></td>
                <td><strong>{c.title}</strong></td>
                <td>{c.site?.name}</td>
                <td><span className="badge badge-info">{billingLabel(c.billingType)}</span></td>
                <td><strong>{formatCurrency(c.rate)}</strong></td>
                <td>{formatDate(c.startDate)}</td>
                <td>{c.endDate ? formatDate(c.endDate) : '—'}</td>
                <td>{c.contractValue ? formatCurrency(c.contractValue) : '—'}</td>
                <td><span className={`badge ${statusClass(c.status)}`}>{c.status}</span></td>
                <td><button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>✏ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? '✏ Edit Contract' : '📋 New Contract'} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{editItem ? 'Update' : 'Create'}</button></>}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group" style={{flexBasis:'100%'}}><label className="form-label">Contract Title *</label>
            <input className="form-control" value={form.title} onChange={e => setForm({...form,title:e.target.value})} required placeholder="e.g. Sand Supply Contract - Vizag Steel Plant" />
          </div>
          <div className="form-group"><label className="form-label">Site *</label>
            <select className="form-control" value={form.site} onChange={e => setForm({...form,site:e.target.value})} required>
              <option value="">Select Site</option>
              {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Product</label>
            <select className="form-control" value={form.product} onChange={e => setForm({...form,product:e.target.value})}>
              <option value="">Select Product</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Vehicle</label>
            <select className="form-control" value={form.vehicle} onChange={e => setForm({...form,vehicle:e.target.value})}>
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Billing Type *</label>
            <select className="form-control" value={form.billingType} onChange={e => setForm({...form,billingType:e.target.value})}>
              {BILLING_TYPES.map(b => <option key={b} value={b}>{billingLabel(b)}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Rate (₹) *</label>
            <input type="number" step="0.01" className="form-control" value={form.rate} onChange={e => setForm({...form,rate:e.target.value})} required placeholder="Rate per unit" />
          </div>
          <div className="form-group"><label className="form-label">Contract Value (₹)</label>
            <input type="number" className="form-control" value={form.contractValue} onChange={e => setForm({...form,contractValue:e.target.value})} />
          </div>
          <div className="form-group"><label className="form-label">GST %</label>
            <select className="form-control" value={form.gstPercent} onChange={e => setForm({...form,gstPercent:Number(e.target.value)})}>
              {[0,5,12,18,28].map(g => <option key={g} value={g}>{g}%</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Start Date *</label>
            <input type="date" className="form-control" value={form.startDate} onChange={e => setForm({...form,startDate:e.target.value})} required />
          </div>
          <div className="form-group"><label className="form-label">End Date</label>
            <input type="date" className="form-control" value={form.endDate} onChange={e => setForm({...form,endDate:e.target.value})} />
          </div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
              {['active','completed','cancelled','expired'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{flexBasis:'100%'}}><label className="form-label">Terms & Conditions</label>
            <textarea className="form-control" rows={3} value={form.terms} onChange={e => setForm({...form,terms:e.target.value})} style={{resize:'vertical'}} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
