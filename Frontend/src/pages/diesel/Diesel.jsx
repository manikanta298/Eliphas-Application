import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatCurrency, formatDate, formatNumber } from '../../utils/helpers';
import { useFY } from '../../contexts/FinancialYearContext';
import { useSite } from '../../contexts/SiteContext';
import './Diesel.css';

const makeEmpty = (siteId = '') => ({
  vehicle: '', site: siteId,
  entryDate: new Date().toISOString().split('T')[0],
  openingReading: '', presentReading: '', closingReading: '',
  ratePerLiter: '', odometerReading: '',  tripLink: '', driverName: '', notes: '',
});

export default function DieselPage() {
  const { selectedFY } = useFY();
  const { selectedSite } = useSite();
  const siteId = selectedSite?._id || '';

  const [entries, setEntries]     = useState([]);
  const [totals, setTotals]       = useState({});
  const [vehicles, setVehicles]   = useState([]);
  const [trips, setTrips]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm]           = useState(makeEmpty(siteId));
  const [search, setSearch]       = useState('');
  const [filters, setFilters]     = useState({ vehicle: '', startDate: '', endDate: '' });
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({});

  // Vehicle autocomplete
  const [vehSuggestions, setVehSuggestions] = useState([]);
  const [vehQuery, setVehQuery] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const res = await api.get('/diesel', {
        params: { ...filters, site: siteId, financialYear: selectedFY?.label, page, limit: 50 },
      });
      setEntries(res.data.data || []);
      setTotals(res.data.totals || {});
      setPagination(res.data.pagination || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters, siteId, selectedFY, page]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    if (!siteId) return;
    api.get('/vehicles', { params: { site: siteId } }).then(r => setVehicles(r.data.data || [])).catch(() => {});
    api.get('/trips', { params: { site: siteId, financialYear: selectedFY?.label, limit: 100 } })
      .then(r => setTrips(r.data.data || [])).catch(() => {});
  }, [siteId, selectedFY]);

  useEffect(() => { setForm(makeEmpty(siteId)); }, [siteId]);

  // Auto-calc closing reading
  const closingAuto = form.openingReading && form.presentReading
    ? Math.abs(Number(form.presentReading) - Number(form.openingReading))
    : null;

  // Auto-calc total amount
  const totalAuto = form.presentReading && form.ratePerLiter
    ? (Number(form.presentReading) * Number(form.ratePerLiter)).toFixed(2)
    : null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleVehInput = (val) => {
    setVehQuery(val);
    if (!val) { setVehSuggestions([]); return; }
    const q = val.toUpperCase();
    setVehSuggestions(vehicles.filter(v => v.vehicleNumber.includes(q)).slice(0, 6));
  };

  const selectVehicle = (v) => {
    set('vehicle', v._id);
    setVehQuery(v.vehicleNumber);
    if (v.driverName) set('driverName', v.driverName);
    if (v.presentDieselReading) set('openingReading', v.presentDieselReading);
    setVehSuggestions([]);
  };

  const openAdd = () => {
    setEditEntry(null);
    setForm(makeEmpty(siteId));
    setVehQuery('');
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    const veh = vehicles.find(v => v._id === (entry.vehicle?._id || entry.vehicle));
    setVehQuery(veh?.vehicleNumber || '');
    setForm({
      vehicle: entry.vehicle?._id || entry.vehicle,
      site: siteId,
      entryDate: entry.entryDate?.split('T')[0],
      openingReading: entry.openingReading || '',
      presentReading: entry.presentReading || '',
      closingReading: entry.closingReading || '',
      ratePerLiter: entry.ratePerLiter || '',
      odometerReading: entry.odometerReading || '',
      tripLink: entry.tripLink?._id || entry.tripLink || '',
      driverName: entry.driverName || '',
      notes: entry.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        site: siteId,
        financialYear: selectedFY?.label,
        openingReading: form.openingReading ? Number(form.openingReading) : 0,
        presentReading: form.presentReading ? Number(form.presentReading) : 0,
        closingReading: form.closingReading ? Number(form.closingReading) : (closingAuto || undefined),
        ratePerLiter: form.ratePerLiter ? Number(form.ratePerLiter) : 0,
        odometerReading: form.odometerReading ? Number(form.odometerReading) : undefined,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });
      if (editEntry) await api.put(`/diesel/${editEntry._id}`, payload);
      else await api.post('/diesel', payload);
      setModalOpen(false);
      fetchEntries();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this diesel entry?')) return;
    await api.delete(`/diesel/${id}`);
    fetchEntries();
  };

  const filteredEntries = search
    ? entries.filter(e =>
        (e.vehicle?.vehicleNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.driverName || '').toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">⛽ Diesel</h2>
          <p className="page-subtitle">{selectedSite?.name || '—'} · Reading-based workflow</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Entry</button>
      </div>

      {/* Search + Filters */}
      <div className="card" style={{ padding:'var(--sp-4)' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input className="form-control" style={{ flex:1, minWidth:180 }} placeholder="🔍 Search vehicle, driver…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <input type="date" className="form-control" style={{ width:150 }} value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          <input type="date" className="form-control" style={{ width:150 }} value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          <button className="btn btn-outline" onClick={() => { setSearch(''); setFilters({ vehicle:'', startDate:'', endDate:'' }); setPage(1); }}>
            ✕ Reset
          </button>
        </div>
      </div>

      {/* Totals */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[
          { label:'Entries', value: totals.count || 0 },
          { label:'Total Litres', value: formatNumber(totals.totalLiters) },
        ].map((s,i) => (
          <div key={i} className="card" style={{ padding:'10px 18px', minWidth:120 }}>
            <span style={{ fontSize:'0.72rem', color:'var(--clr-text3)', textTransform:'uppercase' }}>{s.label}</span>
            <div style={{ fontWeight:700, fontSize:'1.1rem', color:'var(--clr-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state"><div style={{ fontSize:'2.5rem' }}>⛽</div><p>No diesel entries found</p></div>
        ) : (
          <div className="diesel-table" style={{ overflowX:'auto' }}>            <table className="table">
              <thead>
                <tr>
                  <th>Date</th><th>Vehicle</th><th>Driver</th>
                  <th>Opening</th><th>Present</th><th>Closing</th>
                  <th>Odometer</th><th>Remarks</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(e => (
                  <tr key={e._id}>
                    <td>{formatDate(e.entryDate)}</td>
                    <td><strong>{e.vehicle?.vehicleNumber}</strong></td>
                    <td>{e.driverName || '—'}</td>
                    <td>{e.openingReading || 0}</td>
                    <td><strong>{e.presentReading || 0}</strong></td>
                    <td>{e.closingReading ?? '—'}</td>
                    <td style={{ fontSize:'0.78rem', color:'var(--clr-text3)' }}>{e.odometerReading || '—'}</td>
                    <td style={{ fontSize:'0.78rem', color:'var(--clr-text3)' }}>{e.notes || '—'}</td>
                    <td>
                      <button className="btn btn-xs btn-outline" onClick={() => openEdit(e)}>✏️</button>
                      <button className="btn btn-xs btn-danger" style={{ marginLeft:4 }} onClick={() => handleDelete(e._id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div style={{ display:'flex', gap:8, justifyContent:'center', padding:'var(--sp-4)' }}>
            {Array.from({ length: pagination.pages }, (_, i) => i+1).map(p => (
              <button key={p} className={`btn btn-xs ${page === p ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editEntry ? 'Edit Diesel Entry' : 'New Diesel Entry'}>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'var(--sp-4)' }}>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
            <div className="form-group">
              <label className="form-label">Entry Date *</label>
              <input type="date" className="form-control" required value={form.entryDate} onChange={e => set('entryDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Driver Name</label>
              <input className="form-control" value={form.driverName} onChange={e => set('driverName', e.target.value)} />
            </div>
          </div>

          {/* Vehicle autocomplete */}
          <div className="form-group" style={{ position:'relative' }}>
            <label className="form-label">Vehicle *</label>
            <input className="form-control" placeholder="Type vehicle number…" value={vehQuery}
              onChange={e => handleVehInput(e.target.value)} required={!form.vehicle} autoComplete="off" />
            {vehSuggestions.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #dde3f0', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.10)', zIndex:100 }}>
                {vehSuggestions.map(v => (
                  <div key={v._id} style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9' }}
                    onMouseDown={() => selectVehicle(v)}>
                    <strong>{v.vehicleNumber}</strong>
                    {v.driverName && <span style={{ color:'#64748b', marginLeft:8, fontSize:'0.8rem' }}>{v.driverName}</span>}
                    {v.presentDieselReading && <span style={{ color:'#2563eb', marginLeft:8, fontSize:'0.78rem' }}>📖 {v.presentDieselReading} L</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Readings */}
          <div style={{ background:'#f8fafc', borderRadius:8, padding:'var(--sp-4)', display:'flex', flexDirection:'column', gap:'var(--sp-3)' }}>
            <div style={{ fontWeight:700, color:'var(--clr-primary)', fontSize:'0.85rem', marginBottom:2 }}>📖 Reading-Based Entry</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'var(--sp-3)' }}>
              <div className="form-group">
                <label className="form-label">Opening Reading</label>
                <input type="number" step="0.01" className="form-control" value={form.openingReading}
                  onChange={e => set('openingReading', e.target.value)} placeholder="Litres" />
              </div>
              <div className="form-group">
                <label className="form-label">Present Reading (Litres filled)</label>
                <input type="number" step="0.01" className="form-control" value={form.presentReading}
                  onChange={e => set('presentReading', e.target.value)} placeholder="Litres filled" />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Closing Reading
                  {closingAuto !== null && !form.closingReading && (
                    <span style={{ color:'#16a34a', fontSize:'0.72rem', marginLeft:4 }}>(auto: {closingAuto})</span>
                  )}
                </label>
                <input type="number" step="0.01" className="form-control" value={form.closingReading}
                  onChange={e => set('closingReading', e.target.value)}
                  placeholder={closingAuto !== null ? `Auto: ${closingAuto}` : 'Closing reading'} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Odometer Reading (km) — Optional</label>
            <input type="number" className="form-control" value={form.odometerReading}
              onChange={e => set('odometerReading', e.target.value)} placeholder="Optional" />
          </div>

          <div className="form-group">
            <label className="form-label">Link to Trip (optional)</label>
            <select className="form-control" value={form.tripLink} onChange={e => set('tripLink', e.target.value)}>
              <option value="">No trip link</option>
              {trips.map(t => <option key={t._id} value={t._id}>{t.tripNumber} — {t.vehicleNumber || t.vehicle?.vehicleNumber}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <input className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional remarks" />
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setForm(makeEmpty(siteId)); setVehQuery(''); }}>🔄 Reset</button>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editEntry ? 'Update' : 'Save Entry'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
