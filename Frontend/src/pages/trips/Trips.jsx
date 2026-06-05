import './Trips.css';
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatCurrency, formatDate, formatNumber } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import { useSite } from '../../contexts/SiteContext';

const BILLING_TYPES = [
  { value: 'ton',   label: 'Weight (Ton)' },
  { value: 'fixed', label: 'Fixed Contract' },
];

const makeEmpty = (siteId = '') => ({
  site: siteId, vehicle: '', product: '',
  tripDate: new Date().toISOString().split('T')[0],
  billingType: 'ton', rateApplied: '', quantity: '',
  driverName: '', loadingPoint: '', unloadingPoint: '',
});

export default function TripsPage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const { selectedSite } = useSite();
  const siteId = selectedSite?._id || '';

  const [trips, setTrips]         = useState([]);
  const [totals, setTotals]       = useState({});
  const [vehicles, setVehicles]   = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrip, setEditTrip]   = useState(null);
  const [form, setForm]           = useState(makeEmpty(siteId));
  const [search, setSearch]       = useState('');
  const [filters, setFilters]     = useState({ startDate: '', endDate: '', page: 1 });
  const [pagination, setPagination] = useState({});

  // Vehicle autocomplete
  const [vehSuggestions, setVehSuggestions] = useState([]);
  const [vehQuery, setVehQuery] = useState('');

  const fetchTrips = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const res = await api.get('/trips', {
        params: {
          ...filters,
          site: siteId,
          financialYear: selectedFY?.label,
          search: search || undefined,
          limit: 50,
        },
      });
      setTrips(res.data.data || []);
      setTotals(res.data.totals || {});
      setPagination(res.data.pagination || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters, selectedFY, siteId, search]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  useEffect(() => {
    if (!siteId) return;
    api.get('/vehicles', { params: { site: siteId } }).then(r => setVehicles(r.data.data || [])).catch(() => {});
    api.get('/products').then(r => setProducts(r.data.data || [])).catch(() => {});
  }, [siteId]);

  // Reset form when site changes
  useEffect(() => {
    setForm(makeEmpty(siteId));
  }, [siteId]);

  const openAdd = () => {
    setEditTrip(null);
    setForm(makeEmpty(siteId));
    setVehQuery('');
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditTrip(t);
    const veh = vehicles.find(v => v._id === (t.vehicle?._id || t.vehicle));
    setVehQuery(veh?.vehicleNumber || t.vehicleNumber || '');
    setForm({
      site: t.site?._id || t.site || siteId,
      vehicle: t.vehicle?._id || t.vehicle,
      product: t.product?._id || t.product,
      tripDate: t.tripDate?.split('T')[0],
      billingType: ['ton','fixed'].includes(t.billingType) ? t.billingType : 'ton',
      rateApplied: t.rateApplied || '',
      quantity: t.quantity || '',
      driverName: t.driverName || '',
      loadingPoint: t.loadingPoint || '',
      unloadingPoint: t.unloadingPoint || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip?')) return;
    await api.delete(`/trips/${id}`);
    fetchTrips();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        site: siteId,
        financialYear: selectedFY?.label,
        rateApplied: Number(form.rateApplied),
        quantity: form.quantity ? Number(form.quantity) : undefined,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });
      if (editTrip) await api.put(`/trips/${editTrip._id}`, payload);
      else await api.post('/trips', payload);
      setModalOpen(false);
      fetchTrips();
    } catch (err) { alert(err.response?.data?.message || 'Error saving trip'); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Vehicle autocomplete handler
  const handleVehInput = (val) => {
    setVehQuery(val);
    if (val.length < 1) { setVehSuggestions([]); return; }
    const q = val.toUpperCase();
    setVehSuggestions(vehicles.filter(v => v.vehicleNumber.includes(q)).slice(0, 6));
  };

  const selectVehicle = (v) => {
    set('vehicle', v._id);
    setVehQuery(v.vehicleNumber);
    if (v.driverName) set('driverName', v.driverName);
    setVehSuggestions([]);
  };

  const baseAmount = form.billingType === 'ton'
    ? (Number(form.rateApplied) || 0) * (Number(form.quantity) || 0)
    : (Number(form.rateApplied) || 0);

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">🔄 Trips</h2>
          <p className="page-subtitle">{selectedSite?.name || '—'} · FY {selectedFY?.label}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Trip</button>
      </div>

      {/* Search + Filters */}
      <div className="card" style={{ padding:'var(--sp-4)' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input
            className="form-control"
            style={{ flex:1, minWidth:200 }}
            placeholder="🔍 Search vehicle, driver, location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input type="date" className="form-control" style={{ width:150 }} value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, page:1 }))} />
          <input type="date" className="form-control" style={{ width:150 }} value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, page:1 }))} />
          <button className="btn btn-outline" onClick={() => { setSearch(''); setFilters({ startDate:'', endDate:'', page:1 }); }}>
            ✕ Reset
          </button>
        </div>
      </div>

      {/* Totals */}
      {totals && (
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {[
            { label:'Total Trips', value: totals.totalTrips || 0 },
            { label:'Revenue',     value: formatCurrency(totals.totalRevenue) },
            { label:'Qty (Ton)',   value: formatNumber(totals.totalQuantity) },
          ].map((s,i) => (
            <div key={i} className="card" style={{ padding:'10px 18px', display:'flex', flexDirection:'column', gap:2, minWidth:120 }}>
              <span style={{ fontSize:'0.72rem', color:'var(--clr-text3)', textTransform:'uppercase' }}>{s.label}</span>
              <span style={{ fontWeight:700, fontSize:'1.1rem', color:'var(--clr-primary)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
        ) : trips.length === 0 ? (
          <div className="empty-state"><div style={{ fontSize:'2.5rem' }}>🔄</div><p>No trips found</p></div>
        ) : (
          <div className="trips-table" style={{ overflowX:'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Trip #</th><th>Date</th><th>Vehicle</th><th>Driver</th>
                  <th>Product</th><th>Type</th><th>Qty</th><th>Rate</th>
                  <th>Amount</th><th>From → To</th><th style={{ width:80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t._id}>
                    <td><span className="badge badge-primary">{t.tripNumber}</span></td>
                    <td>{formatDate(t.tripDate)}</td>
                    <td><strong>{t.vehicleNumber || t.vehicle?.vehicleNumber}</strong></td>
                    <td>{t.driverName || '—'}</td>
                    <td>{t.product?.name || '—'}</td>
                    <td><span className="badge badge-gray">{t.billingType === 'ton' ? 'Ton' : 'Fixed'}</span></td>
                    <td>{t.billingType === 'ton' ? formatNumber(t.quantity) : '—'}</td>
                    <td>{formatCurrency(t.rateApplied)}</td>
                    <td><strong>{formatCurrency(t.baseAmount)}</strong></td>
                    <td style={{ fontSize:'0.78rem', color:'var(--clr-text3)' }}>{t.loadingPoint} → {t.unloadingPoint}</td>
                    <td>
                      <button className="btn btn-xs btn-outline" onClick={() => openEdit(t)}>✏️</button>
                      {can('canDeleteTrips') && (
                        <button className="btn btn-xs btn-danger" style={{ marginLeft:4 }} onClick={() => handleDelete(t._id)}>🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'var(--sp-4)' }}>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`btn btn-xs ${filters.page === p ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilters(f => ({ ...f, page: p }))}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTrip ? 'Edit Trip' : 'New Trip'}>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'var(--sp-4)' }}>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Trip Date *</label>
              <input type="date" className="form-control" required value={form.tripDate} onChange={e => set('tripDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Billing Type *</label>
              <select className="form-control" required value={form.billingType} onChange={e => set('billingType', e.target.value)}>
                {BILLING_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>

          {/* Vehicle autocomplete */}
          <div className="form-group" style={{ position:'relative' }}>
            <label className="form-label">Vehicle *</label>
            <input
              className="form-control"
              placeholder="Type vehicle number…"
              value={vehQuery}
              onChange={e => handleVehInput(e.target.value)}
              required={!form.vehicle}
              autoComplete="off"
            />
            {vehSuggestions.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #dde3f0', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.10)', zIndex:100, maxHeight:200, overflowY:'auto' }}>
                {vehSuggestions.map(v => (
                  <div key={v._id} style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9' }}
                    onMouseDown={() => selectVehicle(v)}>
                    <strong>{v.vehicleNumber}</strong>
                    {v.driverName && <span style={{ color:'#64748b', marginLeft:8, fontSize:'0.8rem' }}>{v.driverName}</span>}
                    <span style={{ color:'#94a3b8', marginLeft:8, fontSize:'0.75rem' }}>{v.vehicleType}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-control" required value={form.product} onChange={e => set('product', e.target.value)}>
                <option value="">Select product…</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Driver Name</label>
              <input className="form-control" value={form.driverName} onChange={e => set('driverName', e.target.value)} placeholder="Driver name" />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Rate Applied (₹) *</label>
              <input type="number" step="0.01" className="form-control" required value={form.rateApplied} onChange={e => set('rateApplied', e.target.value)} />
            </div>
            {form.billingType === 'ton' && (
              <div className="form-group">
                <label className="form-label">Quantity (Ton)</label>
                <input type="number" step="0.001" className="form-control" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
              </div>
            )}
          </div>

          {/* Live amount preview */}
          {baseAmount > 0 && (
            <div style={{ background:'#eef2ff', borderRadius:8, padding:'10px 14px', fontWeight:700, color:'var(--clr-primary)' }}>
              Base Amount: ₹{baseAmount.toLocaleString('en-IN')}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Loading Point</label>
              <input className="form-control" value={form.loadingPoint} onChange={e => set('loadingPoint', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Unloading Point</label>
              <input className="form-control" value={form.unloadingPoint} onChange={e => set('unloadingPoint', e.target.value)} />
            </div>
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" className="btn btn-outline" onClick={() => { setForm(makeEmpty(siteId)); setVehQuery(''); }}>
              🔄 Reset
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {editTrip ? 'Update Trip' : 'Save Trip'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
