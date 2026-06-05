import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatCurrency, calcMargin } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = ['Sand','Coal','Granite','Steel','FlyAsh','Construction','Other'];
const UNITS = ['Ton','KG','CFT','Unit','Load'];

const emptyForm = { name:'', category:'Sand', unit:'Ton', purchaseRate:'', sellingRate:'', transportRate:'', gstPercent:18, tdsPercent:1, description:'' };

export default function ProductsPage() {
  const { can } = useAuth();
  const [products, setProducts] = useState([]);
  const [modal, setModal]       = useState(false);
  const [editItem, setEdit]     = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [catFilter, setCat]     = useState('');
  const [search, setSearch]     = useState('');

  const fetch = useCallback(async () => {
    const r = await api.get('/products', { params: catFilter ? { category: catFilter } : {} });
    setProducts(r.data.data);
  }, [catFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd  = () => { setForm(emptyForm); setEdit(null); setModal(true); };
  const openEdit = (p) => { setEdit(p); setForm({ name:p.name, category:p.category, unit:p.unit, purchaseRate:p.purchaseRate||'', sellingRate:p.sellingRate, transportRate:p.transportRate||'', gstPercent:p.gstPercent, tdsPercent:p.tdsPercent, description:p.description||'' }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) await api.put(`/products/${editItem._id}`, form);
      else await api.post('/products', form);
      setModal(false); fetch();
    } catch (err) { alert(err.response?.data?.message||'Error'); }
  };

  const margin = calcMargin(Number(form.purchaseRate), Number(form.sellingRate));
  const catColors = { Sand:'#f59e0b', Coal:'#6b7280', Granite:'#6366f1', Steel:'#3b82f6', FlyAsh:'#8b5cf6', Construction:'#22c55e', Other:'#ec4899' };

  return (
    <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
      <div className="page-header">
        <div><h2 className="page-title">📦 Product Management</h2><p className="page-subtitle">Manage materials with pricing, GST, TDS configuration</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      <div className="filters-bar">
        <input className="form-control" placeholder="🔍 Search products..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:260}} />
        <select className="form-control" value={catFilter} onChange={e=>setCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {(search || catFilter) && <button className="btn btn-secondary btn-sm" onClick={()=>{setSearch('');setCat('');}}>✕ Reset</button>}
      </div>

      <div className="table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Unit</th>
              {can('canViewSupplierCost') && <th>Purchase Rate</th>}
              <th>Selling Rate</th>
              {can('canViewSupplierCost') && <th>Margin %</th>}
              <th>Transport Rate</th><th>GST</th><th>TDS</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.filter(p =>
              (!search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
            ).length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">📦</div><p>{search ? `No results for "${search}"` : 'No products found'}</p></div></td></tr>
            ) : products.filter(p =>
              (!search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
            ).map(p=>(
              <tr key={p._id}>
                <td><strong>{p.name}</strong>{p.description&&<div style={{fontSize:'0.75rem',color:'var(--clr-text3)'}}>{p.description}</div>}</td>
                <td>
                  <span className="badge" style={{background:`${catColors[p.category]||'#888'}22`,color:catColors[p.category]||'#888'}}>{p.category}</span>
                </td>
                <td><span className="badge badge-neutral">{p.unit}</span></td>
                {can('canViewSupplierCost') && <td>{formatCurrency(p.purchaseRate)}</td>}
                <td><strong>{formatCurrency(p.sellingRate)}</strong></td>
                {can('canViewSupplierCost') && (
                  <td>
                    <span style={{color: p.marginPercent >= 15 ? 'var(--clr-success)' : p.marginPercent >= 5 ? 'var(--clr-warning)' : 'var(--clr-danger)', fontWeight:700}}>
                      {p.marginPercent}%
                    </span>
                  </td>
                )}
                <td>{p.transportRate ? formatCurrency(p.transportRate) : '—'}</td>
                <td><span className="badge badge-info">{p.gstPercent}%</span></td>
                <td><span className="badge badge-warning">{p.tdsPercent}%</span></td>
                <td><div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(p)}>✏</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={()=>setModal(false)} title={editItem?'✏ Edit Product':'📦 Add Product'}
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{editItem?'Update':'Save'}</button></>}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group"><label className="form-label">Product Name *</label><input className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="e.g. River Sand"/></div>
          <div className="form-group"><label className="form-label">Category *</label>
            <select className="form-control" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Unit</label>
            <select className="form-control" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
              {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Purchase Rate (₹) *</label><input type="number" step="0.01" className="form-control" value={form.purchaseRate} onChange={e=>setForm({...form,purchaseRate:e.target.value})} required placeholder="0.00"/></div>
          <div className="form-group"><label className="form-label">Selling Rate (₹) *</label><input type="number" step="0.01" className="form-control" value={form.sellingRate} onChange={e=>setForm({...form,sellingRate:e.target.value})} required placeholder="0.00"/></div>
          <div className="form-group"><label className="form-label">Transport Rate (₹/unit)</label><input type="number" step="0.01" className="form-control" value={form.transportRate} onChange={e=>setForm({...form,transportRate:e.target.value})} placeholder="0.00"/></div>
          <div className="form-group"><label className="form-label">GST %</label>
            <select className="form-control" value={form.gstPercent} onChange={e=>setForm({...form,gstPercent:Number(e.target.value)})}>
              {[0,5,12,18,28].map(g=><option key={g} value={g}>{g}%</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">TDS %</label>
            <select className="form-control" value={form.tdsPercent} onChange={e=>setForm({...form,tdsPercent:Number(e.target.value)})}>
              {[0,1,2,5,10].map(t=><option key={t} value={t}>{t}%</option>)}
            </select>
          </div>
        </form>
        {form.purchaseRate && form.sellingRate && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'var(--sp-3) var(--sp-4)',background:'var(--clr-accent-dim)',border:'1px solid var(--clr-accent-glow)',borderRadius:'var(--r-md)',marginTop:'var(--sp-4)'}}>
            <span style={{fontSize:'0.85rem',color:'var(--clr-text2)'}}>Calculated Margin</span>
            <strong style={{fontFamily:'var(--font-display)',color: margin >= 10 ? 'var(--clr-success)':'var(--clr-warning)'}}>{margin}%</strong>
          </div>
        )}
      </Modal>
    </div>
  );
}
