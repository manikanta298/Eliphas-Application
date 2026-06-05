import './Sites.css';
// Sites.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatDate, statusClass, formatCurrency } from '../../utils/helpers';
import { useSite } from '../../contexts/SiteContext';

const emptyForm = { name:'', clientCompany:'', clientContact:'', clientPhone:'', clientEmail:'', location:'', address:'', startDate:'', endDate:'', contractValue:'', description:'', status:'active' };

export function SitesPage() {
  const navigate = useNavigate();
  const { changeSite } = useSite();
  const [sites, setSites]     = useState([]);
  const [users, setUsers]     = useState([]);
  const [modal, setModal]     = useState(false);
  const [editItem, setEdit]   = useState(null);
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const r = await api.get('/sites');
    setSites(r.data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); api.get('/users').then(r => setUsers(r.data.data)).catch(()=>{}); }, [fetch]);

  const openAdd  = () => { setForm(emptyForm); setEdit(null); setModal(true); };
  const openEdit = (s) => { setEdit(s); setForm({ name:s.name, clientCompany:s.clientCompany, clientContact:s.clientContact||'', clientPhone:s.clientPhone||'', clientEmail:s.clientEmail||'', location:s.location||'', address:s.address||'', startDate:s.startDate?.split('T')[0]||'', endDate:s.endDate?.split('T')[0]||'', contractValue:s.contractValue||'', description:s.description||'', status:s.status }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) await api.put(`/sites/${editItem._id}`, form);
      else await api.post('/sites', form);
      setModal(false); fetch();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleDelete = async (id) => {
    if (!confirm('Delete site?')) return;
    await api.delete(`/sites/${id}`); fetch();
  };

  return (
    <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
      <div className="page-header">
        <div><h2 className="page-title">🗺 Site Management</h2><p className="page-subtitle">Select a site to open its dashboard, or manage sites below</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Site</button>
      </div>

      <div style={{display:'flex',flexWrap:'wrap',gap:'var(--sp-4)'}}>
        {loading ? <div className="spinner spinner-lg" style={{margin:'60px auto'}} /> :
         sites.length === 0 ? <div className="empty-state w-full"><div className="empty-state-icon">🗺</div><p>No sites yet. Add your first site.</p></div> :
         sites.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.clientCompany||'').toLowerCase().includes(search.toLowerCase()) || (s.location||'').toLowerCase().includes(search.toLowerCase())).map(s => (
          <div key={s._id} className="card"
            style={{flex:'1 1 300px',minWidth:'280px', cursor:'pointer', transition:'box-shadow 0.15s, transform 0.15s'}}
            onClick={() => { changeSite(s._id); navigate('/'); }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 32px rgba(26,60,143,0.18)'; e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform=''; }}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'var(--sp-4)'}}>
              <div>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:'700'}}>{s.name}</h3>
                <p style={{fontSize:'0.8rem',color:'var(--clr-text3)',marginTop:'2px'}}>{s.code}</p>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:'0.7rem',color:'#1a3c8f',background:'#eef2ff',padding:'2px 8px',borderRadius:20,fontWeight:600}}>Click to open →</span>
                <span className={`badge ${statusClass(s.status)}`}>{s.status}</span>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-2)',fontSize:'0.85rem',color:'var(--clr-text2)'}}>
              <div><strong>Client:</strong> {s.clientCompany}</div>
              <div><strong>Contact:</strong> {s.clientContact || '—'} {s.clientPhone && `· ${s.clientPhone}`}</div>
              <div><strong>Location:</strong> {s.location || '—'}</div>
              <div><strong>Contract Value:</strong> {s.contractValue ? formatCurrency(s.contractValue) : '—'}</div>
              <div><strong>Start:</strong> {formatDate(s.startDate)} {s.endDate && `· End: ${formatDate(s.endDate)}`}</div>
            </div>
            <div style={{display:'flex',gap:'var(--sp-2)',marginTop:'var(--sp-4)'}}>
              <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); openEdit(s); }}>✏ Edit</button>
              <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDelete(s._id); }}>🗑 Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modal} onClose={()=>setModal(false)} title={editItem?'✏ Edit Site':'🗺 Add New Site'}
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{editItem?'Update':'Save'}</button></>}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          {[['name','Site Name','text',true],['clientCompany','Client Company','text',true],['clientContact','Contact Person','text'],['clientPhone','Phone','tel'],['clientEmail','Email','email'],['location','Location','text'],['contractValue','Contract Value (₹)','number']].map(([k,l,t,req])=>(
            <div key={k} className="form-group"><label className="form-label">{l}{req&&' *'}</label>
              <input type={t} className="form-control" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} required={!!req} />
            </div>
          ))}
          <div className="form-group"><label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              {['active','inactive','completed'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-control" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
          <div className="form-group"><label className="form-label">End Date</label><input type="date" className="form-control" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
          <div className="form-group" style={{flexBasis:'100%'}}><label className="form-label">Address</label>
            <textarea className="form-control" rows={2} value={form.address} onChange={e=>setForm({...form,address:e.target.value})} style={{resize:'vertical'}} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
