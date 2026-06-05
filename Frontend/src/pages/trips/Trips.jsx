import './Trips.css';
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import ComboInput from '../../components/common/ComboInput';
import { formatCurrency, formatDate, formatNumber } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import { useSite } from '../../contexts/SiteContext';

const BILLING_TYPES = [
  { value: 'trip',     label: 'Trip' },
  { value: 'contract', label: 'Contract' },
  { value: 'perTon',   label: 'Per Ton' },
  { value: 'machine',  label: 'Machine' },
];

const makeEmpty = (siteId = '') => ({
  site: siteId,
  clientName: '', companyName: '', phoneNumber: '',
  vehicle: '', vehicleNumber: '',
  challanNumber: '', loadType: '',
  loadingPoint: '', unloadingPoint: '',
  billingType: 'trip', unitValue: '',
  companyRate: '', companyFare: '',  // companyFare = auto
  rateApplied: '', baseAmount: '',   // baseAmount = auto (client fare)
  dieselQuantity: '', dieselPricePerLitre: '',
  tripDate: new Date().toISOString().split('T')[0],
  tripTime: '',
  remarks: '',
  driverName: '',
});

export default function TripsPage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const { selectedSite } = useSite();
  const siteId = selectedSite?._id || '';

  const [trips, setTrips]         = useState([]);
  const [totals, setTotals]       = useState({});
  const [vehicles, setVehicles]   = useState([]);
  const [customers, setCustomers] = useState([]);   // for ComboInput
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrip, setEditTrip]   = useState(null);
  const [form, setForm]           = useState(makeEmpty(siteId));
  const [search, setSearch]       = useState('');
  const [filters, setFilters]     = useState({ startDate: '', endDate: '', page: 1 });
  const [pagination, setPagination] = useState({});

  // ── computed auto fields ─────────────────────────────────
  const companyFareAuto = (Number(form.companyRate) || 0) * (Number(form.unitValue) || 0);
  const needsUnit = ['perTon', 'machine', 'ton'].includes(form.billingType);
  const clientFareAuto = needsUnit
    ? (Number(form.rateApplied) || 0) * (Number(form.unitValue) || 0)
    : (Number(form.rateApplied) || 0);

  const fetchTrips = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const res = await api.get('/trips', {
        params: { ...filters, site: siteId, financialYear: selectedFY?.label, search: search || undefined, limit: 50 },
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
    api.get('/vehicles', { params: { site: siteId } }).then(r => {
      const list = (r.data.data || []).map(v => ({ ...v, name: v.vehicleNumber }));
      setVehicles(list);
    }).catch(() => {});
    // Load customers/companies for ComboInput
    api.get('/companies').then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, [siteId]);

  useEffect(() => { setForm(makeEmpty(siteId)); }, [siteId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditTrip(null); setForm(makeEmpty(siteId)); setModalOpen(true); };
  const openEdit = (t) => {
    setEditTrip(t);
    setForm({
      site: t.site?._id || t.site || siteId,
      clientName: t.clientName || '', companyName: t.companyName || '', phoneNumber: t.phoneNumber || '',
      vehicle: t.vehicle?._id || t.vehicle || '', vehicleNumber: t.vehicleNumber || '',
      challanNumber: t.challanNumber || '', loadType: t.loadType || '',
      loadingPoint: t.loadingPoint || '', unloadingPoint: t.unloadingPoint || '',
      billingType: t.billingType || 'trip',
      unitValue: t.unitValue || '', companyRate: t.companyRate || '',
      companyFare: t.companyFare || '', rateApplied: t.rateApplied || '',
      dieselQuantity: t.dieselQuantity || '', dieselPricePerLitre: t.dieselPricePerLitre || '',
      tripDate: t.tripDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      tripTime: t.tripTime || '', remarks: t.remarks || '',
      driverName: t.driverName || '',
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
        companyFare:  companyFareAuto,
        baseAmount:   clientFareAuto,
        dieselExpense: (Number(form.dieselQuantity) || 0) * (Number(form.dieselPricePerLitre) || 0),
        rateApplied:  Number(form.rateApplied) || 0,
        unitValue:    Number(form.unitValue) || 0,
        companyRate:  Number(form.companyRate) || 0,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });
      if (editTrip) await api.put(`/trips/${editTrip._id}`, payload);
      else await api.post('/trips', payload);
      setModalOpen(false);
      fetchTrips();
    } catch (err) { alert(err.response?.data?.message || 'Error saving billing entry'); }
  };

  // ── Time options ──────────────────────────────────────────
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    ['00', '30'].forEach(m => {
      const hh = String(h).padStart(2, '0');
      timeOptions.push(`${hh}:${m}`);
    });
  }

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">🧾 Billing Entries</h2>
          <p className="page-subtitle">{selectedSite?.name || '—'} · FY {selectedFY?.label}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Billing Entry</button>
      </div>

      {/* Search + Filters */}
      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="form-control" style={{ flex: 1, minWidth: 200 }}
            placeholder="🔍 Search vehicle, client, challan…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <input type="date" className="form-control" style={{ width: 150 }} value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))} />
          <input type="date" className="form-control" style={{ width: 150 }} value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))} />
          <button className="btn btn-outline" onClick={() => { setSearch(''); setFilters({ startDate: '', endDate: '', page: 1 }); }}>
            ✕ Reset
          </button>
        </div>
      </div>

      {/* Totals */}
      {totals && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Entries', value: totals.totalTrips || 0 },
            { label: 'Revenue',       value: formatCurrency(totals.totalRevenue) },
            { label: 'Qty (Units)',   value: formatNumber(totals.totalQuantity) },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 130 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--clr-text3)', textTransform: 'uppercase' }}>{s.label}</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--clr-primary)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : trips.length === 0 ? (
          <div className="empty-state"><div style={{ fontSize: '2.5rem' }}>🧾</div><p>No billing entries found</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Entry #</th><th>Date</th><th>Client</th><th>Vehicle</th>
                  <th>Challan</th><th>Type</th><th>Unit Val</th>
                  <th>Co. Fare</th><th>Cl. Fare</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t._id}>
                    <td><span className="badge badge-primary">{t.tripNumber}</span></td>
                    <td>{formatDate(t.tripDate)}</td>
                    <td>{t.clientName || '—'}</td>
                    <td><strong>{t.vehicleNumber || t.vehicle?.vehicleNumber || '—'}</strong></td>
                    <td>{t.challanNumber || '—'}</td>
                    <td><span className="badge badge-gray">{BILLING_TYPES.find(b => b.value === t.billingType)?.label || t.billingType}</span></td>
                    <td>{formatNumber(t.unitValue)}</td>
                    <td>{formatCurrency(t.companyFare)}</td>
                    <td><strong>{formatCurrency(t.baseAmount)}</strong></td>
                    <td>
                      <button className="btn btn-xs btn-outline" onClick={() => openEdit(t)}>✏️</button>
                      {can('canDeleteTrips') && (
                        <button className="btn btn-xs btn-danger" style={{ marginLeft: 4 }} onClick={() => handleDelete(t._id)}>🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 'var(--sp-4)' }}>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`btn btn-xs ${filters.page === p ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilters(f => ({ ...f, page: p }))}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editTrip ? 'Edit Billing Entry' : 'Add Billing Entry'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

          {/* Row 1: Client Name | Company Name | Phone Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
            <ComboInput
              label="Client Name" required
              value={form.clientName}
              options={customers}
              onSelect={c => set('clientName', c.name)}
              onChange={v => set('clientName', v)}
              placeholder="Client name…"
            />
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-control" value={form.companyName}
                onChange={e => set('companyName', e.target.value)} placeholder="Company Name" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-control" value={form.phoneNumber}
                onChange={e => set('phoneNumber', e.target.value)} placeholder="Phone Number" />
            </div>
          </div>

          {/* Row 2: Vehicle Number | Challan Number | Load Type/Cargo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
            <ComboInput
              label="Vehicle Number" required
              value={form.vehicleNumber}
              options={vehicles}
              onSelect={v => { set('vehicle', v._id); set('vehicleNumber', v.vehicleNumber); if (v.driverName) set('driverName', v.driverName); }}
              onChange={val => { set('vehicleNumber', val); set('vehicle', ''); }}
              placeholder="e.g. AP12AB1234"
            />
            <div className="form-group">
              <label className="form-label">Challan Number *</label>
              <input className="form-control" required value={form.challanNumber}
                onChange={e => set('challanNumber', e.target.value)} placeholder="Challan Number" />
            </div>
            <div className="form-group">
              <label className="form-label">Load Type / Cargo</label>
              <input className="form-control" value={form.loadType}
                onChange={e => set('loadType', e.target.value)} placeholder="e.g. L-STONE, COAL" />
            </div>
          </div>

          {/* Row 3: From Location | To Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">From Location</label>
              <input className="form-control" value={form.loadingPoint}
                onChange={e => set('loadingPoint', e.target.value)} placeholder="From" />
            </div>
            <div className="form-group">
              <label className="form-label">To Location</label>
              <input className="form-control" value={form.unloadingPoint}
                onChange={e => set('unloadingPoint', e.target.value)} placeholder="To" />
            </div>
          </div>

          {/* Row 4: Billing Basis | Unit Value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Billing Basis</label>
              <select className="form-control" value={form.billingType}
                onChange={e => set('billingType', e.target.value)}>
                {BILLING_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit Value</label>
              <input type="number" step="0.001" className="form-control" value={form.unitValue}
                onChange={e => set('unitValue', e.target.value)} placeholder="Unit value" />
            </div>
          </div>

          {/* Row 5: Company Rate | Company Fare (auto) | Client Rate | Client Fare (auto) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Company Rate (₹)</label>
              <input type="number" step="0.01" className="form-control" value={form.companyRate}
                onChange={e => set('companyRate', e.target.value)} placeholder="Rate" />
            </div>
            <div className="form-group">
              <label className="form-label">Company Fare (auto)</label>
              <input className="form-control" readOnly
                value={companyFareAuto > 0 ? companyFareAuto.toLocaleString('en-IN') : ''}
                style={{ background: 'var(--clr-bg)', color: 'var(--clr-text2)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Client Rate (₹)</label>
              <input type="number" step="0.01" className="form-control" value={form.rateApplied}
                onChange={e => set('rateApplied', e.target.value)} placeholder="Rate" />
            </div>
            <div className="form-group">
              <label className="form-label">Client Fare (auto)</label>
              <input className="form-control" readOnly
                value={clientFareAuto > 0 ? clientFareAuto.toLocaleString('en-IN') : ''}
                style={{ background: 'var(--clr-bg)', color: 'var(--clr-text2)' }} />
            </div>
          </div>

          {/* Row 6: Diesel Quantity | Diesel Price/Litre */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Diesel Quantity (Litres)</label>
              <input type="number" step="0.01" className="form-control" value={form.dieselQuantity}
                onChange={e => set('dieselQuantity', e.target.value)} placeholder="Litres" />
            </div>
            <div className="form-group">
              <label className="form-label">Diesel Price / Litre (₹)</label>
              <input type="number" step="0.01" className="form-control" value={form.dieselPricePerLitre}
                onChange={e => set('dieselPricePerLitre', e.target.value)} placeholder="₹/litre" />
            </div>
          </div>

          {/* Row 7: Date | Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <select className="form-control" value={form.tripDate}
                onChange={e => set('tripDate', e.target.value)}>
                {/* Last 30 days */}
                {Array.from({ length: 30 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - i);
                  const val = d.toISOString().split('T')[0];
                  return <option key={val} value={val}>{val}</option>;
                })}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <select className="form-control" value={form.tripTime}
                onChange={e => set('tripTime', e.target.value)}>
                <option value="">-- Select Time --</option>
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div className="form-group">
            <label className="form-label">Remarks <span style={{ color: 'var(--clr-text3)', fontWeight: 400 }}>(optional)</span></label>
            <textarea className="form-control" rows={3} value={form.remarks}
              onChange={e => set('remarks', e.target.value)}
              placeholder="Any additional notes or remarks…"
              style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-outline"
              onClick={() => { setForm(makeEmpty(siteId)); }}>🔄 Reset</button>
            <button type="button" className="btn btn-outline"
              onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {editTrip ? 'Update Entry' : 'Save Billing Entry ✓'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
