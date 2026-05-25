import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { formatCurrency, formatDate, statusClass } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import { useFY } from '../../contexts/FinancialYearContext';
import './Invoices.css';

export default function InvoicesPage() {
  const { can } = useAuth();
  const { selectedFY } = useFY();
  const [invoices, setInvoices]   = useState([]);
  const [totals, setTotals]       = useState({});
  const [sites, setSites]         = useState([]);
  const [trips, setTrips]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [filters, setFilters]     = useState({ type:'customer', site:'', paymentStatus:'', startDate:'', endDate:'' });
  const [viewInvoice, setViewInvoice] = useState(null);
  const [newInvModal, setNewInvModal] = useState(false);
  const [payModal, setPayModal]   = useState({ open:false, invoice:null });
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [invForm, setInvForm]     = useState({ site:'', gstPercent:18, tdsPercent:0, notes:'', terms:'Payment due within 30 days.', dueDate:'', customer:{ name:'',company:'',address:'',gstin:'',phone:'' } });
  const [payForm, setPayForm]     = useState({ amount:'', mode:'bank', reference:'', date:new Date().toISOString().split('T')[0] });
  const printRef = useRef();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { params: filters });
      setInvoices(res.data.data);
      setTotals(res.data.totals);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data.data));
  }, []);

  const loadUnbilledTrips = async (siteId) => {
    if (!siteId) return;
    const res = await api.get('/trips', { params: { site: siteId, status: 'pending,completed', limit: 200 } });
    setTrips(res.data.data.filter(t => t.status !== 'invoiced'));
  };

  const toggleTrip = (id) => setSelectedTrips(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedTrips.length) return alert('Select at least one trip');
    try {
      await api.post('/invoices/customer', { ...invForm, tripIds: selectedTrips });
      setNewInvModal(false);
      setSelectedTrips([]);
      fetchInvoices();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/invoices/${payModal.invoice._id}/payment`, payForm);
      setPayModal({ open:false, invoice:null });
      fetchInvoices();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleViewInvoice = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setViewInvoice(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load invoice');
    }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('','_blank','width=900,height=700');
    w.document.write(`
      <html><head><title>Invoice</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',Arial,sans-serif;color:#111;background:#fff;padding:32px}
        .inv-header{display:flex;justify-content:space-between;margin-bottom:28px}
        .inv-brand{font-size:22px;font-weight:800;color:#f5a623}
        .inv-num{text-align:right}
        .inv-num h2{font-size:18px;font-weight:700}
        table{width:100%;border-collapse:collapse;margin:20px 0}
        th{background:#f5f5f5;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
        td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}
        .totals-section{margin-left:auto;width:300px}
        .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
        .grand-total{font-size:16px;font-weight:700;border-top:2px solid #111;padding-top:8px;margin-top:8px}
        .parties{display:flex;gap:40px;margin-bottom:24px;padding:16px;background:#f9f9f9;border-radius:8px}
        .party h4{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px}
        .party p{font-size:13px;line-height:1.6}
      </style></head>
      <body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  // Calc selected trips total for preview
  const selectedTripsData = trips.filter(t => selectedTrips.includes(t._id));
  const previewSubtotal   = selectedTripsData.reduce((s,t) => s + (t.baseAmount||0), 0);
  const previewGST        = (previewSubtotal * (invForm.gstPercent||0)) / 100;
  const previewTDS        = (previewSubtotal * (invForm.tdsPercent||0)) / 100;
  const previewTotal      = previewSubtotal + previewGST - previewTDS;

  return (
    <div className="animate-fade" style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
      <div className="page-header">
        <div>
          <h2 className="page-title">🧾 Invoice Management</h2>
          <p className="page-subtitle">Generate, track, and manage customer & supplier invoices</p>
        </div>
        <button className="btn btn-primary" onClick={() => setNewInvModal(true)}>+ Create Invoice</button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="form-control" value={filters.type} onChange={e => setFilters({...filters,type:e.target.value})}>
          <option value="customer">Customer Invoices</option>
          {can('canViewSupplierCost') && <option value="supplier">Supplier Invoices</option>}
        </select>
        <select className="form-control" value={filters.site} onChange={e => setFilters({...filters,site:e.target.value})}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select className="form-control" value={filters.paymentStatus} onChange={e => setFilters({...filters,paymentStatus:e.target.value})}>
          <option value="">All Status</option>
          {['unpaid','partial','paid','overdue'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters({...filters,startDate:e.target.value})} />
        <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters({...filters,endDate:e.target.value})} />
        <button className="btn btn-secondary btn-sm" onClick={() => setFilters({type:'customer',site:'',paymentStatus:'',startDate:'',endDate:''})}>✕</button>
      </div>

      {/* Totals */}
      <div className="totals-bar">
        <div className="total-item"><span className="total-item-label">Total Invoiced</span><span className="total-item-value">{formatCurrency(totals.totalAmount)}</span></div>
        <div className="total-item"><span className="total-item-label">Total Collected</span><span className="total-item-value">{formatCurrency(totals.paidAmount)}</span></div>
        <div className="total-item"><span className="total-item-label">Pending</span><span className="total-item-value" style={{color:'var(--clr-warning)'}}>{formatCurrency((totals.totalAmount||0)-(totals.paidAmount||0))}</span></div>
        <div className="total-item"><span className="total-item-label">Invoice Count</span><span className="total-item-value">{totals.count||0}</span></div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="erp-table">
          <thead>
            <tr><th>Invoice #</th><th>Date</th><th>Client / Supplier</th><th>Site</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{textAlign:'center',padding:'40px'}}><div className="spinner" style={{margin:'auto'}}/></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">🧾</div><p>No invoices found</p></div></td></tr>
            ) : invoices.map(inv => (
              <tr key={inv._id}>
                <td><strong style={{color:'var(--clr-accent)',fontFamily:'var(--font-display)',fontSize:'0.85rem'}}>{inv.invoiceNumber}</strong></td>
                <td>{formatDate(inv.invoiceDate)}<div style={{fontSize:'0.72rem',color:'var(--clr-text3)'}}>Due: {formatDate(inv.dueDate)}</div></td>
                <td>
                  <strong>{inv.customer?.company || inv.supplier?.company || '—'}</strong>
                  <div style={{fontSize:'0.75rem',color:'var(--clr-text3)'}}>{inv.customer?.name || inv.supplier?.name}</div>
                </td>
                <td>{inv.site?.name}</td>
                <td><strong>{formatCurrency(inv.totalAmount)}</strong></td>
                <td style={{color:'var(--clr-success)'}}>{formatCurrency(inv.paidAmount)}</td>
                <td style={{color:'var(--clr-warning)'}}>{formatCurrency(inv.balanceAmount)}</td>
                <td><span className={`badge ${statusClass(inv.paymentStatus)}`}>{inv.paymentStatus}</span></td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={()=>handleViewInvoice(inv._id)}>👁 View</button>
                    {inv.paymentStatus !== 'paid' && <button className="btn btn-success btn-sm" onClick={()=>setPayModal({open:true,invoice:inv})}>💳 Pay</button>}
                    {can('canDeleteFinancial') && <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(inv._id)}>🗑</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      <Modal isOpen={newInvModal} onClose={()=>setNewInvModal(false)} title="🧾 Create Customer Invoice" size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setNewInvModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateInvoice} disabled={!selectedTrips.length}>Generate Invoice ({selectedTrips.length} trips)</button>
        </>}
      >
        <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-5)'}}>
          {/* Customer Info */}
          <div>
            <h4 style={{marginBottom:'var(--sp-3)',color:'var(--clr-text2)',fontSize:'0.8rem',textTransform:'uppercase',letterSpacing:'.06em'}}>Customer Details</h4>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Site *</label>
                <select className="form-control" value={invForm.site} onChange={e=>{setInvForm({...invForm,site:e.target.value});loadUnbilledTrips(e.target.value);}} required>
                  <option value="">Select Site</option>
                  {sites.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Company Name</label>
                <input className="form-control" value={invForm.customer.company} onChange={e=>setInvForm({...invForm,customer:{...invForm.customer,company:e.target.value}})} placeholder="Client Company" />
              </div>
              <div className="form-group"><label className="form-label">Contact Person</label>
                <input className="form-control" value={invForm.customer.name} onChange={e=>setInvForm({...invForm,customer:{...invForm.customer,name:e.target.value}})} placeholder="Name" />
              </div>
              <div className="form-group"><label className="form-label">GSTIN</label>
                <input className="form-control" value={invForm.customer.gstin} onChange={e=>setInvForm({...invForm,customer:{...invForm.customer,gstin:e.target.value}})} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="form-group"><label className="form-label">GST %</label>
                <select className="form-control" value={invForm.gstPercent} onChange={e=>setInvForm({...invForm,gstPercent:Number(e.target.value)})}>
                  {[0,5,12,18,28].map(g=><option key={g} value={g}>{g}%</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">TDS %</label>
                <select className="form-control" value={invForm.tdsPercent} onChange={e=>setInvForm({...invForm,tdsPercent:Number(e.target.value)})}>
                  {[0,1,2,5,10].map(t=><option key={t} value={t}>{t}%</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Due Date</label>
                <input type="date" className="form-control" value={invForm.dueDate} onChange={e=>setInvForm({...invForm,dueDate:e.target.value})} />
              </div>
            </div>
          </div>

          {/* Trip selection */}
          {trips.length > 0 && (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'var(--sp-3)'}}>
                <h4 style={{color:'var(--clr-text2)',fontSize:'0.8rem',textTransform:'uppercase',letterSpacing:'.06em'}}>Select Trips to Invoice</h4>
                <button className="btn btn-ghost btn-sm" type="button" onClick={()=>setSelectedTrips(trips.map(t=>t._id))}>Select All</button>
              </div>
              <div className="table-wrap" style={{maxHeight:'260px',overflowY:'auto'}}>
                <table className="erp-table">
                  <thead><tr><th>☑</th><th>Trip #</th><th>Date</th><th>Vehicle</th><th>Product</th><th>Qty</th><th>Amount</th></tr></thead>
                  <tbody>
                    {trips.map(t=>(
                      <tr key={t._id} style={{cursor:'pointer'}} onClick={()=>toggleTrip(t._id)}>
                        <td><input type="checkbox" checked={selectedTrips.includes(t._id)} onChange={()=>toggleTrip(t._id)} onClick={e=>e.stopPropagation()} /></td>
                        <td style={{fontSize:'0.8rem',color:'var(--clr-accent)'}}>{t.tripNumber}</td>
                        <td>{formatDate(t.tripDate)}</td>
                        <td>{t.vehicle?.vehicleNumber}</td>
                        <td>{t.product?.name}</td>
                        <td>{t.quantity||'—'}</td>
                        <td><strong>{formatCurrency(t.baseAmount)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedTrips.length > 0 && (
            <div className="inv-preview-box">
              <div className="inv-preview-row"><span>Subtotal ({selectedTrips.length} trips)</span><strong>{formatCurrency(previewSubtotal)}</strong></div>
              <div className="inv-preview-row"><span>GST ({invForm.gstPercent}%)</span><span style={{color:'var(--clr-warning)'}}>+{formatCurrency(previewGST)}</span></div>
              {previewTDS > 0 && <div className="inv-preview-row"><span>TDS ({invForm.tdsPercent}%)</span><span style={{color:'var(--clr-info)'}}>-{formatCurrency(previewTDS)}</span></div>}
              <div className="inv-preview-row inv-preview-total"><span>Total Payable</span><strong style={{color:'var(--clr-accent)'}}>{formatCurrency(previewTotal)}</strong></div>
            </div>
          )}
        </div>
      </Modal>

      {/* View Invoice Modal */}
      <Modal isOpen={!!viewInvoice} onClose={()=>setViewInvoice(null)} title={`Invoice ${viewInvoice?.invoiceNumber}`} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setViewInvoice(null)}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}>🖨 Print Invoice</button>
        </>}
      >
        {viewInvoice && (
          <div ref={printRef} className="invoice-print">
            <div className="inv-header">
              <div>
                <div className="inv-brand-name">⬡ LogiCore ERP</div>
                <div style={{fontSize:'0.8rem',color:'#888',marginTop:'4px'}}>Logistics & Transport Management</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="inv-number">{viewInvoice.invoiceNumber}</div>
                <div style={{fontSize:'0.85rem',color:'#666',marginTop:'4px'}}>Date: {formatDate(viewInvoice.invoiceDate)}</div>
                {viewInvoice.dueDate && <div style={{fontSize:'0.85rem',color:'#d97706'}}>Due: {formatDate(viewInvoice.dueDate)}</div>}
              </div>
            </div>

            <div className="inv-parties">
              <div className="inv-party">
                <h4>Bill To</h4>
                <p><strong>{viewInvoice.customer?.company}</strong></p>
                <p>{viewInvoice.customer?.name}</p>
                <p>{viewInvoice.customer?.address}</p>
                <p>GSTIN: {viewInvoice.customer?.gstin || 'N/A'}</p>
              </div>
              <div className="inv-party">
                <h4>Site</h4>
                <p><strong>{viewInvoice.site?.name}</strong></p>
                <p>{viewInvoice.site?.clientCompany}</p>
                <p>Site Code: {viewInvoice.site?.code}</p>
              </div>
            </div>

            <table className="inv-items-table">
              <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                {viewInvoice.items?.map((item,i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{item.description}</td>
                    <td>{item.quantity||item.trips||'—'}</td>
                    <td>{item.unit}</td>
                    <td>{formatCurrency(item.rate)}</td>
                    <td><strong>{formatCurrency(item.amount)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="inv-totals">
              <div className="inv-total-row"><span>Subtotal</span><span>{formatCurrency(viewInvoice.subtotal)}</span></div>
              <div className="inv-total-row"><span>GST ({viewInvoice.gstPercent}%)</span><span>+{formatCurrency(viewInvoice.gstAmount)}</span></div>
              {viewInvoice.tdsAmount > 0 && <div className="inv-total-row"><span>TDS ({viewInvoice.tdsPercent}%)</span><span>-{formatCurrency(viewInvoice.tdsAmount)}</span></div>}
              <div className="inv-total-row inv-grand-total"><span>Total Amount</span><strong>{formatCurrency(viewInvoice.totalAmount)}</strong></div>
              {viewInvoice.paidAmount > 0 && <div className="inv-total-row" style={{color:'var(--clr-success)'}}><span>Amount Paid</span><span>-{formatCurrency(viewInvoice.paidAmount)}</span></div>}
              <div className="inv-total-row" style={{color:'var(--clr-warning)'}}><span>Balance Due</span><strong>{formatCurrency(viewInvoice.balanceAmount)}</strong></div>
            </div>

            {viewInvoice.notes && <div style={{marginTop:'20px',fontSize:'0.85rem',color:'#666'}}><strong>Notes:</strong> {viewInvoice.notes}</div>}
            <div style={{marginTop:'8px',fontSize:'0.8rem',color:'#999'}}><strong>Terms:</strong> {viewInvoice.terms}</div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={payModal.open} onClose={()=>setPayModal({open:false,invoice:null})} title="💳 Record Payment" size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setPayModal({open:false,invoice:null})}>Cancel</button>
          <button className="btn btn-success" onClick={handlePayment}>Record Payment</button>
        </>}
      >
        <div style={{marginBottom:'var(--sp-4)',padding:'var(--sp-3) var(--sp-4)',background:'var(--clr-surface2)',borderRadius:'var(--r-md)'}}>
          <div style={{fontSize:'0.8rem',color:'var(--clr-text3)'}}>Invoice</div>
          <strong>{payModal.invoice?.invoiceNumber}</strong> — Balance: <strong style={{color:'var(--clr-warning)'}}>{formatCurrency(payModal.invoice?.balanceAmount)}</strong>
        </div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Amount (₹) *</label>
            <input type="number" className="form-control" value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:Number(e.target.value)})} placeholder="0.00" />
          </div>
          <div className="form-group"><label className="form-label">Payment Mode</label>
            <select className="form-control" value={payForm.mode} onChange={e=>setPayForm({...payForm,mode:e.target.value})}>
              {['cash','bank','cheque','upi'].map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Reference</label>
            <input className="form-control" value={payForm.reference} onChange={e=>setPayForm({...payForm,reference:e.target.value})} placeholder="Txn/Cheque #" />
          </div>
          <div className="form-group"><label className="form-label">Payment Date</label>
            <input type="date" className="form-control" value={payForm.date} onChange={e=>setPayForm({...payForm,date:e.target.value})} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
