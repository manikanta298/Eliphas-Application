import './Users.css';
// UsersPage
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatDateTime, roleLabel, statusClass } from '../../utils/helpers';

const emptyForm = { name:'', email:'', password:'', role:'staff', phone:'', isActive:true };

export function UsersPage() {
  const [users, setUsers]   = useState([]);
  const [sites, setSites]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [editItem, setEdit] = useState(null);
  const [form, setForm]     = useState(emptyForm);

  const fetch = useCallback(async()=>{
    const r = await api.get('/users');
    setUsers(r.data.data);
  },[]);

  useEffect(()=>{ fetch(); api.get('/sites').then(r=>setSites(r.data.data)); },[fetch]);

  const openAdd  = ()=>{ setForm(emptyForm); setEdit(null); setModal(true); };
  const openEdit = (u)=>{ setEdit(u); setForm({name:u.name,email:u.email,password:'',role:u.role,phone:u.phone||'',isActive:u.isActive}); setModal(true); };

  const handleSubmit = async(e)=>{
    e.preventDefault();
    try{
      const payload = editItem ? {...form, ...(form.password?{password:form.password}:{})} : form;
      if(!payload.password) delete payload.password;
      if(editItem) await api.put(`/users/${editItem._id}`,payload);
      else await api.post('/users',payload);
      setModal(false); fetch();
    }catch(err){alert(err.response?.data?.message||'Error');}
  };

  const roleColors = { masterAdmin:'#f5a623', admin:'#3b82f6', manager:'#22c55e', staff:'#9aa3bb' };

  return(
    <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
      <div className="page-header">
        <div><h2 className="page-title">👥 User Management</h2><p className="page-subtitle">Manage ERP users and role-based access</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add User</button>
      </div>

      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Phone</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u._id}>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:'var(--sp-3)'}}>
                    <div style={{width:'32px',height:'32px',borderRadius:'50%',background:roleColors[u.role]||'#888',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'0.85rem',flexShrink:0}}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <strong>{u.name}</strong>
                  </div>
                </td>
                <td>{u.email}</td>
                <td><span className="badge" style={{background:`${roleColors[u.role]||'#888'}22`,color:roleColors[u.role]||'#888'}}>{roleLabel(u.role)}</span></td>
                <td>{u.phone||'—'}</td>
                <td style={{fontSize:'0.8rem',color:'var(--clr-text3)'}}>{u.lastLogin?formatDateTime(u.lastLogin):'Never'}</td>
                <td><span className={`badge ${u.isActive?'badge-success':'badge-danger'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                <td><button className="btn btn-secondary btn-sm" onClick={()=>openEdit(u)}>✏ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={()=>setModal(false)} title={editItem?'✏ Edit User':'👤 Add User'}
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{editItem?'Update':'Create'}</button></>}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
          <div className="form-group"><label className="form-label">Email *</label><input type="email" className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div>
          <div className="form-group"><label className="form-label">Password {editItem&&'(leave blank to keep)'}</label><input type="password" className="form-control" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} {...(!editItem&&{required:true})}/></div>
          <div className="form-group"><label className="form-label">Phone</label><input type="tel" className="form-control" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
          <div className="form-group"><label className="form-label">Role *</label>
            <select className="form-control" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              {['masterAdmin','admin','manager','staff'].map(r=><option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="form-control" value={form.isActive} onChange={e=>setForm({...form,isActive:e.target.value==='true'})}>
              <option value="true">Active</option><option value="false">Inactive</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ActivityPage
export function ActivityPage() {
  const [logs, setLogs]     = useState([]);
  const [pagination, setPag]= useState({});
  const [page, setPage]     = useState(1);
  const [loading, setLoad]  = useState(false);

  const fetch = useCallback(async()=>{
    setLoad(true);
    try{
      const r = await api.get('/activity',{params:{page,limit:50}});
      setLogs(r.data.data);
      setPag(r.data.pagination);
    }catch(e){console.error(e);}
    finally{setLoad(false);}
  },[page]);

  useEffect(()=>{fetch();},[fetch]);

  const actionColors={LOGIN:'var(--clr-success)',CREATE:'var(--clr-info)',UPDATE:'var(--clr-warning)',DELETE:'var(--clr-danger)'};

  return(
    <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
      <div className="page-header">
        <div><h2 className="page-title">🕐 Activity Logs</h2><p className="page-subtitle">Full audit trail of all ERP actions</p></div>
      </div>
      <div className="table-wrap">
        <table className="erp-table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Description</th><th>IP</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={6} style={{textAlign:'center',padding:'40px'}}><div className="spinner" style={{margin:'auto'}}/></td></tr>:
            logs.map(l=>(
              <tr key={l._id}>
                <td style={{fontSize:'0.8rem',color:'var(--clr-text3)'}}>{formatDateTime(l.createdAt)}</td>
                <td><strong>{l.user?.name||l.userName}</strong><div style={{fontSize:'0.72rem',color:'var(--clr-text3)'}}>{l.user?.role}</div></td>
                <td><span className="badge" style={{background:`${actionColors[l.action]||'#888'}22`,color:actionColors[l.action]||'var(--clr-text2)'}}>{l.action}</span></td>
                <td><span className="badge badge-neutral">{l.module}</span></td>
                <td style={{fontSize:'0.85rem',color:'var(--clr-text2)'}}>{l.description}</td>
                <td style={{fontSize:'0.75rem',color:'var(--clr-text3)'}}>{l.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination.pages>1&&(
        <div className="flex gap-3 items-center justify-center">
          <button className="btn btn-secondary btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
          <span style={{color:'var(--clr-text3)',fontSize:'0.875rem'}}>Page {page} of {pagination.pages}</span>
          <button className="btn btn-secondary btn-sm" onClick={()=>setPage(p=>Math.min(pagination.pages,p+1))} disabled={page===pagination.pages}>Next →</button>
        </div>
      )}
    </div>
  );
}
