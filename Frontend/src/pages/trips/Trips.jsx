import './Trips.css';
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatCurrency, formatDate, formatNumber, billingLabel, statusClass, calcBillingAmount } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';

const BILLING_TYPES = ['trip','ton','weight','km','hourly','daily','weekly','monthly','fixed','machineRental','custom'];
const STATUS_LIST   = ['pending','completed','invoiced','cancelled'];

const emptyForm = {
  site:'', vehicle:'', product:'', tripDate: new Date().toISOString().split('T')[0],
  billingType:'trip', rateApplied:'', quantity:'', weight:'', kilometers:'', hours:'', days:'',
  supplierRate:'', vendorExpense:'', dieselExpense:'', gstAmount:'', tdsAmount:'',
  driverName:'', loadingPoint:'', unloadingPoint:'', status:'pending',
};

const optionalNumberFields = [
  'quantity', 'weight', 'kilometers', 'hours', 'days',
  'supplierRate', 'vendorExpense', 'dieselExpense', 'gstAmount', 'tdsAmount',
];

const buildTripPayload = (form, financialYear) => {
  const payload = { ...form, financialYear };

  optionalNumberFields.forEach((field) => {
    if (payload[field] === '') delete payload[field];
    else payload[field] = Number(payload[field]);
  });

  payload.rateApplied = Number(payload.rateApplied);
  Object.keys(payload).forEach((key) => {
    if (payload[key] === '') delete payload[key];
  });

  return payload;
};

export default function TripsPage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const [trips, setTrips]       = useState([]);
  const [totals, setTotals]     = useState({});
  const [sites, setSites]       = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [filters, setFilters]   = useState({ site:'', vehicle:'', status:'', startDate:'', endDate:'', page:1 });
  const [pagination, setPagination] = useState({});

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/trips', { params: { ...filters, limit: 50, financialYear: selectedFY?.label } });
      setTrips(res.data.data);
      setTotals(res.data.totals);
      setPagination(res.data.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data.data));
    api.get('/vehicles').then(r => setVehicles(r.data.data));
    api.get('/products').then(r => setProducts(r.data.data));
  }, []);

  const openAdd  = () => { setForm(emptyForm); setEditTrip(null); setModalOpen(true); };
  const openEdit = (t) => {
    setEditTrip(t);
    setForm({
      site: t.site?._id||t.site, vehicle: t.vehicle?._id||t.vehicle, product: t.product?._id||t.product,
      tripDate: t.tripDate?.split('T')[0], billingType: t.billingType,
      rateApplied: t.rateApplied, quantity: t.quantity||'', weight: t.weight||'',
      kilometers: t.kilometers||'', hours: t.hours||'', days: t.days||'',
      supplierRate: t.supplierRate||'', vendorExpense: t.vendorExpense||'',
      dieselExpense: t.dieselExpense||'', gstAmount: t.gstAmount||'', tdsAmount: t.tdsAmount||'',
      driverName: t.driverName||'', loadingPoint: t.loadingPoint||'',
      unloadingPoint: t.unloadingPoint||'', status: t.status,
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
      const payload = buildTripPayload(form, selectedFY?.label);
      if (editTrip) await api.put(`/trips/${editTrip._id}`, payload);
      else await api.post('/trips', payload);
      setModalOpen(false);
      fetchTrips();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  // Live calc preview
  const previewAmount = form.rateApplied ? calcBillingAmount(form.billingType, Number(form.rateApplied), {
    quantity: Number(form.quantity), weight: Number(form.weight),
    km: Number(form.kilometers), hours: Number(form.hours), days: Number(form.days),
  }) : 0;

  const previewProfit = can('canViewProfit') && previewAmount
    ? previewAmount - (Number(form.supplierRate)||0) * (Number(form.quantity)||1)
      - (Number(form.vendorExpense)||0) - (Number(form.dieselExpense)||0)
    : null;

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">🔄 Trip Management</h2>
          <p className="page-subtitle">Log and track all logistics trips</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Trip</button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="form-control" value={filters.site} onChange={e => setFilters({...filters,site:e.target.value,page:1})}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select className="form-control" value={filters.vehicle} onChange={e => setFilters({...filters,vehicle:e.target.value,page:1})}>
          <option value="">All Vehicles</option>
          {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber}</option>)}
        </select>
        <select className="form-control" value={filters.status} onChange={e => setFilters({...filters,status:e.target.value,page:1})}>
          <option value="">All Status</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters({...filters,startDate:e.target.value})} />
        <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters({...filters,endDate:e.target.value})} />
        <button className="btn btn-secondary btn-sm" onClick={() => setFilters({site:'',vehicle:'',status:'',startDate:'',endDate:'',page:1})}>✕</button>
      </div>

      {/* Totals */}
      <div className="totals-bar">
        <div className="total-item"><span className="total-item-label">Total Trips</span><span className="total-item-value">{totals.totalTrips||0}</span></div>
        <div className="total-item"><span className="total-item-label">Total Revenue</span><span className="total-item-value">{formatCurrency(totals.totalRevenue)}</span></div>
        <div className="total-item"><span className="total-item-label">Total Quantity</span><span className="total-item-value">{formatNumber(totals.totalQty,1)} T</span></div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Trip #</th><th>Date</th><th>Site</th><th>Vehicle</th>
              <th>Product</th><th>Billing Type</th><th>Quantity</th>
              <th>Revenue</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{textAlign:'center',padding:'40px'}}><div className="spinner" style={{margin:'auto'}}/></td></tr>
            ) : trips.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">🔄</div><p>No trips found</p></div></td></tr>
            ) : trips.map(t => (
              <tr key={t._id}>
                <td><strong style={{color:'var(--clr-accent)',fontFamily:'var(--font-display)',fontSize:'0.8rem'}}>{t.tripNumber}</strong></td>
                <td>{formatDate(t.tripDate)}</td>
                <td>{t.site?.name}</td>
                <td>
                  <strong>{t.vehicle?.vehicleNumber}</strong>
                  <div style={{fontSize:'0.72rem',color:'var(--clr-text3)'}}>{t.driverName||t.vehicle?.driverName}</div>
                </td>
                <td>{t.product?.name}</td>
                <td><span className="badge badge-info">{billingLabel(t.billingType)}</span></td>
                <td>{t.quantity ? `${formatNumber(t.quantity,1)} ${t.product?.unit||'T'}` : '—'}</td>
                <td><strong style={{color:'var(--clr-accent)'}}>{formatCurrency(t.baseAmount)}</strong></td>
                <td><span className={`badge ${statusClass(t.status)}`}>{t.status}</span></td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>✏</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex gap-3 items-center justify-center">
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters(f=>({...f,page:Math.max(1,f.page-1)}))} disabled={filters.page===1}>← Prev</button>
          <span style={{color:'var(--clr-text3)',fontSize:'0.875rem'}}>Page {filters.page} of {pagination.pages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters(f=>({...f,page:Math.min(pagination.pages,f.page+1)}))} disabled={filters.page===pagination.pages}>Next →</button>
        </div>
      )}

      {/* Trip Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editTrip ? '✏ Edit Trip' : '🔄 New Trip Entry'} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{editTrip ? 'Update' : 'Save Trip'}</button>
        </>}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group"><label className="form-label">Site *</label>
            <select className="form-control" value={form.site} onChange={e=>setForm({...form,site:e.target.value})} required>
              <option value="">Select Site</option>
              {sites.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Vehicle *</label>
            <select className="form-control" value={form.vehicle} onChange={e=>setForm({...form,vehicle:e.target.value})} required>
              <option value="">Select Vehicle</option>
              {vehicles.map(v=><option key={v._id} value={v._id}>{v.vehicleNumber} — {v.driverName}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Product *</label>
            <select className="form-control" value={form.product} onChange={e=>setForm({...form,product:e.target.value})} required>
              <option value="">Select Product</option>
              {products.map(p=><option key={p._id} value={p._id}>{p.name} ({p.category})</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Trip Date *</label>
            <input type="date" className="form-control" value={form.tripDate} onChange={e=>setForm({...form,tripDate:e.target.value})} required />
          </div>
          <div className="form-group"><label className="form-label">Billing Type *</label>
            <select className="form-control" value={form.billingType} onChange={e=>setForm({...form,billingType:e.target.value})} required>
              {BILLING_TYPES.map(b=><option key={b} value={b}>{billingLabel(b)}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Rate Applied (₹) *</label>
            <input type="number" step="0.01" className="form-control" placeholder="Rate" value={form.rateApplied} onChange={e=>setForm({...form,rateApplied:e.target.value})} required />
          </div>

          {/* Dynamic measurement fields based on billing type */}
          {['ton','weight'].includes(form.billingType) && (
            <div className="form-group"><label className="form-label">Quantity (Tons)</label>
              <input type="number" step="0.01" className="form-control" placeholder="e.g. 12.5" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} />
            </div>
          )}
          {form.billingType === 'weight' && (
            <div className="form-group"><label className="form-label">Weight (KG)</label>
              <input type="number" className="form-control" placeholder="e.g. 12500" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} />
            </div>
          )}
          {form.billingType === 'km' && (
            <div className="form-group"><label className="form-label">Kilometers</label>
              <input type="number" step="0.1" className="form-control" placeholder="e.g. 45" value={form.kilometers} onChange={e=>setForm({...form,kilometers:e.target.value})} />
            </div>
          )}
          {['hourly','machineRental'].includes(form.billingType) && (
            <div className="form-group"><label className="form-label">Hours</label>
              <input type="number" step="0.5" className="form-control" placeholder="e.g. 8" value={form.hours} onChange={e=>setForm({...form,hours:e.target.value})} />
            </div>
          )}
          {['daily','weekly','monthly'].includes(form.billingType) && (
            <div className="form-group"><label className="form-label">Days</label>
              <input type="number" className="form-control" placeholder="e.g. 5" value={form.days} onChange={e=>setForm({...form,days:e.target.value})} />
            </div>
          )}

          <div className="form-group"><label className="form-label">Driver Name</label>
            <input type="text" className="form-control" placeholder="Driver" value={form.driverName} onChange={e=>setForm({...form,driverName:e.target.value})} />
          </div>
          <div className="form-group"><label className="form-label">Loading Point</label>
            <input type="text" className="form-control" placeholder="From" value={form.loadingPoint} onChange={e=>setForm({...form,loadingPoint:e.target.value})} />
          </div>
          <div className="form-group"><label className="form-label">Unloading Point</label>
            <input type="text" className="form-control" placeholder="To" value={form.unloadingPoint} onChange={e=>setForm({...form,unloadingPoint:e.target.value})} />
          </div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              {STATUS_LIST.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>

          {/* Internal cost fields for admins */}
          {can('canViewSupplierCost') && (
            <>
              <div className="form-group"><label className="form-label">Supplier Rate (₹/unit) [Internal]</label>
                <input type="number" step="0.01" className="form-control" placeholder="Purchase rate" value={form.supplierRate} onChange={e=>setForm({...form,supplierRate:e.target.value})} />
              </div>
              <div className="form-group"><label className="form-label">Vendor Expense (₹)</label>
                <input type="number" step="0.01" className="form-control" value={form.vendorExpense} onChange={e=>setForm({...form,vendorExpense:e.target.value})} />
              </div>
              <div className="form-group"><label className="form-label">Diesel Expense (₹)</label>
                <input type="number" step="0.01" className="form-control" value={form.dieselExpense} onChange={e=>setForm({...form,dieselExpense:e.target.value})} />
              </div>
            </>
          )}
        </form>

        {/* Calculation Preview */}
        {previewAmount > 0 && (
          <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-2)',padding:'var(--sp-4)',background:'var(--clr-accent-dim)',border:'1px solid var(--clr-accent-glow)',borderRadius:'var(--r-md)',marginTop:'var(--sp-4)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'0.85rem',color:'var(--clr-text2)'}}>Calculated Billing Amount</span>
              <strong style={{fontFamily:'var(--font-display)',fontSize:'1.2rem',color:'var(--clr-accent)'}}>{formatCurrency(previewAmount)}</strong>
            </div>
            {previewProfit !== null && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'0.85rem',color:'var(--clr-text2)'}}>Estimated Net Profit</span>
                <strong style={{fontFamily:'var(--font-display)',fontSize:'1rem',color: previewProfit >= 0 ? 'var(--clr-success)':'var(--clr-danger)'}}>{formatCurrency(previewProfit)}</strong>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
