import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatCurrency, formatDate, formatNumber, formatDateTime } from '../../utils/helpers';
import { useFY } from '../../contexts/FinancialYearContext';
import './Diesel.css';

const SHIFTS = ['morning', 'evening', 'night'];

const emptyForm = {
  vehicle: '', site: '', entryDate: new Date().toISOString().split('T')[0],
  shift: 'morning', openingLiters: '', closingLiters: '',
  liters: '', ratePerLiter: '', odometerReading: '',
  fuelStation: '', driver: '', driverName: '', notes: '',
};

export default function DieselPage() {
  const { selectedFY } = useFY();
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [sites, setSites] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState([]);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ site: '', vehicle: '', shift: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, limit: 50 };
      const res = await api.get('/diesel', { params });
      setEntries(res.data.data);
      setTotals(res.data.totals);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles(r.data.data));
    api.get('/sites').then(r => setSites(r.data.data));
    api.get('/drivers').then(r => setDrivers(r.data.data || []));
  }, []);

  const openSummary = async () => {
    const res = await api.get('/diesel/summary', { params: filters });
    setSummary(res.data.data);
    setSummaryOpen(true);
  };

  const openAdd = () => { setForm(emptyForm); setEditEntry(null); setModalOpen(true); };
  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      vehicle: entry.vehicle?._id || entry.vehicle,
      site: entry.site?._id || entry.site,
      entryDate: entry.entryDate?.split('T')[0],
      shift: entry.shift,
      liters: entry.liters,
      ratePerLiter: entry.ratePerLiter,
      odometerReading: entry.odometerReading || '',
      fuelStation: entry.fuelStation || '',
      driverName: entry.driverName || '',
      notes: entry.notes || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this diesel entry?')) return;
    await api.delete(`/diesel/${id}`);
    fetchEntries();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editEntry) {
        await api.put(`/diesel/${editEntry._id}`, form);
      } else {
        await api.post('/diesel', form);
      }
      setModalOpen(false);
      fetchEntries();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving entry');
    }
  };

  const totalAmount = form.liters && form.ratePerLiter
    ? (Number(form.liters) * Number(form.ratePerLiter)).toFixed(2)
    : 0;

  return (
    <div className="diesel-page animate-fade">
      <div className="page-header">
        <div>
          <h2 className="page-title">⛽ Diesel Management</h2>
          <p className="page-subtitle">Track fuel consumption across all vehicles and sites</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={openSummary}>📊 Vehicle Summary</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Entry</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="form-control" value={filters.site} onChange={e => setFilters({ ...filters, site: e.target.value })}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select className="form-control" value={filters.vehicle} onChange={e => setFilters({ ...filters, vehicle: e.target.value })}>
          <option value="">All Vehicles</option>
          {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber}</option>)}
        </select>
        <select className="form-control" value={filters.shift} onChange={e => setFilters({ ...filters, shift: e.target.value })}>
          <option value="">All Shifts</option>
          {SHIFTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <input type="date" className="form-control" value={filters.startDate}
          onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
        <input type="date" className="form-control" value={filters.endDate}
          onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
        <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ site:'',vehicle:'',shift:'',startDate:'',endDate:'' })}>
          ✕ Clear
        </button>
      </div>

      {/* Totals */}
      {totals && (
        <div className="totals-bar">
          <div className="total-item">
            <span className="total-item-label">Total Entries</span>
            <span className="total-item-value">{totals.count || 0}</span>
          </div>
          <div className="total-item">
            <span className="total-item-label">Total Liters</span>
            <span className="total-item-value">{formatNumber(totals.totalLiters, 0)} L</span>
          </div>
          <div className="total-item">
            <span className="total-item-label">Total Amount</span>
            <span className="total-item-value">{formatCurrency(totals.totalAmount)}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Date / Shift</th>
              <th>Vehicle</th>
              <th>Site</th>
              <th>Driver</th>
              <th>Liters</th>
              <th>Liters</th>
              <th>Rate/L</th>
              <th>Total Amount</th>
              <th>Odometer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">⛽</div><p>No diesel entries found</p></div></td></tr>
            ) : entries.map(entry => (
              <tr key={entry._id}>
                <td>
                  <div>{formatDate(entry.entryDate)}</div>
                  <span className={`badge badge-${entry.shift === 'morning' ? 'info' : entry.shift === 'evening' ? 'warning' : 'neutral'}`}>
                    {entry.shift}
                  </span>
                </td>
                <td>
                  <strong>{entry.vehicle?.vehicleNumber}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-text3)' }}>{entry.vehicle?.vehicleType}</div>
                </td>
                <td>{entry.site?.name}</td>
                <td>{entry.driverName || entry.driver?.name || '—'}</td>
                <td><strong>{formatNumber(entry.liters, 1)} L</strong></td>
                <td>₹{entry.ratePerLiter}/L</td>
                <td><strong style={{ color: 'var(--clr-accent)' }}>{formatCurrency(entry.totalAmount)}</strong></td>
                <td>{entry.odometerReading ? `${formatNumber(entry.odometerReading, 0)} km` : '—'}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(entry)}>✏ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(entry._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex gap-3 items-center justify-center" style={{ marginTop: 'var(--sp-4)' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span style={{ color: 'var(--clr-text3)', fontSize: '0.875rem' }}>Page {page} of {pagination.pages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editEntry ? '✏ Edit Diesel Entry' : '⛽ New Diesel Entry'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editEntry ? 'Update Entry' : 'Save Entry'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select className="form-control" value={form.vehicle} onChange={e => setForm({ ...form, vehicle: e.target.value })} required>
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber} — {v.driverName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Site *</label>
            <select className="form-control" value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} required>
              <option value="">Select Site</option>
              {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input type="date" className="form-control" value={form.entryDate} onChange={e => setForm({ ...form, entryDate: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Shift</label>
            <select className="form-control" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
              {SHIFTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Liters *</label>
            <input type="number" step="0.1" className="form-control" placeholder="e.g. 45.5" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Rate per Liter (₹) *</label>
            <input type="number" step="0.01" className="form-control" placeholder="e.g. 95.50" value={form.ratePerLiter} onChange={e => setForm({ ...form, ratePerLiter: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Driver</label>
            <select className="form-control" value={form.driver}
              onChange={e => {
                const d = drivers.find(d => d._id === e.target.value);
                setForm({ ...form, driver: e.target.value, driverName: d?.name || '' });
              }}>
              <option value="">Select Driver</option>
              {drivers.map(d => <option key={d._id} value={d._id}>{d.name} — {d.phone}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Opening (Ltr)</label>
            <input type="number" className="form-control" placeholder="0.00" value={form.openingLiters}
              onChange={e => {
                const open = Number(e.target.value) || 0;
                const close = Number(form.closingLiters) || 0;
                const diff = Math.abs(open - close);
                setForm({ ...form, openingLiters: e.target.value, liters: diff || form.liters });
              }} />
          </div>
          <div className="form-group">
            <label className="form-label">Closing (Ltr)</label>
            <input type="number" className="form-control" placeholder="0.00" value={form.closingLiters}
              onChange={e => {
                const close = Number(e.target.value) || 0;
                const open = Number(form.openingLiters) || 0;
                const diff = Math.abs(open - close);
                setForm({ ...form, closingLiters: e.target.value, liters: diff || form.liters });
              }} />
          </div>
          <div className="form-group">
            <label className="form-label">Odometer (km)</label>
            <input type="number" className="form-control" placeholder="Current reading" value={form.odometerReading} onChange={e => setForm({ ...form, odometerReading: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Fuel Station</label>
            <input type="text" className="form-control" placeholder="Station name" value={form.fuelStation} onChange={e => setForm({ ...form, fuelStation: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input type="text" className="form-control" placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </form>
        {totalAmount > 0 && (
          <div className="diesel-calc-preview">
            <span>Calculated Total:</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        )}
      </Modal>

      {/* Vehicle Summary Modal */}
      <Modal isOpen={summaryOpen} onClose={() => setSummaryOpen(false)} title="📊 Vehicle-wise Diesel Summary" size="lg">
        <div className="table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Total Entries</th>
                <th>Total Liters</th>
                <th>Total Amount</th>
                <th>First Entry</th>
                <th>Last Entry</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s, i) => (
                <tr key={i}>
                  <td><strong>{s.vehicle?.vehicleNumber}</strong> <br /><span style={{ fontSize:'0.75rem', color:'var(--clr-text3)' }}>{s.vehicle?.vehicleType}</span></td>
                  <td>{s.entries}</td>
                  <td><strong>{formatNumber(s.totalLiters, 1)} L</strong></td>
                  <td><strong style={{ color: 'var(--clr-accent)' }}>{formatCurrency(s.totalAmount)}</strong></td>
                  <td>{formatDate(s.firstDate)}</td>
                  <td>{formatDate(s.lastDate)}</td>
                </tr>
              ))}
              {!summary.length && (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">⛽</div><p>No data</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
