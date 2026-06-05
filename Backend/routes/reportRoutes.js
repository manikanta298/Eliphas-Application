const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Trip        = require('../models/Trip');
const DieselEntry = require('../models/DieselEntry');
const Invoice     = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const Vehicle     = require('../models/Vehicle');
const Company     = require('../models/Company');

router.use(protect);

const toObjId = (id) => {
  try { return new mongoose.Types.ObjectId(id); } catch { return null; }
};

const buildDateRange = (field, startDate, endDate) => {
  const d = {};
  if (startDate) d.$gte = new Date(startDate);
  if (endDate)   d.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
  return Object.keys(d).length ? { [field]: d } : {};
};

// Transport / Trips
router.get('/trips', async (req, res) => {
  try {
    const { site, startDate, endDate, financialYear } = req.query;
    const match = { isDeleted: false };
    if (site && site !== 'all') { const id = toObjId(site); if (id) match.site = id; }
    if (financialYear) match.financialYear = financialYear;
    Object.assign(match, buildDateRange('tripDate', startDate, endDate));
    const data = await Trip.find(match)
      .populate('site', 'name')
      .populate('vehicle', 'vehicleNumber')
      .populate('product', 'name unit')
      .sort({ tripDate: -1 })
      .lean();
    const flat = data.map(t => ({
      'Trip #': t.tripNumber,
      'Date': t.tripDate?.toISOString().split('T')[0],
      'Site': t.site?.name,
      'Vehicle': t.vehicle?.vehicleNumber || t.vehicleNumber,
      'Driver': t.driverName,
      'Product': t.product?.name,
      'Billing': t.billingType === 'ton' ? 'Ton' : 'Fixed',
      'Qty (Ton)': t.quantity || '',
      'Rate (₹)': t.rateApplied,
      'Amount (₹)': t.baseAmount,
      'From': t.loadingPoint,
      'To': t.unloadingPoint,
    }));
    res.json({ success: true, data: flat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Diesel
router.get('/diesel', async (req, res) => {
  try {
    const { site, startDate, endDate, financialYear } = req.query;
    const match = { isDeleted: false };
    if (site && site !== 'all') { const id = toObjId(site); if (id) match.site = id; }
    if (financialYear) match.financialYear = financialYear;
    Object.assign(match, buildDateRange('entryDate', startDate, endDate));
    const data = await DieselEntry.find(match)
      .populate('vehicle', 'vehicleNumber')
      .populate('site', 'name')
      .sort({ entryDate: -1 })
      .lean();
    const flat = data.map(e => ({
      'Date': e.entryDate?.toISOString().split('T')[0],
      'Site': e.site?.name,
      'Vehicle': e.vehicle?.vehicleNumber,
      'Driver': e.driverName,
      'Opening Reading': e.openingReading,
      'Present Reading': e.presentReading,
      'Closing Reading': e.closingReading,
      'Rate/Ltr (₹)': e.ratePerLiter,
      'Amount (₹)': e.totalAmount,
      'Odometer': e.odometerReading || '',
      'Remarks': e.notes || '',
    }));
    res.json({ success: true, data: flat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Invoices
router.get('/invoices', async (req, res) => {
  try {
    const { site, startDate, endDate, financialYear } = req.query;
    const match = { isDeleted: false, invoiceType: { $in: ['customer', 'supplier'] } };
    if (site && site !== 'all') { const id = toObjId(site); if (id) match.site = id; }
    if (financialYear) match.financialYear = financialYear;
    Object.assign(match, buildDateRange('invoiceDate', startDate, endDate));
    const data = await Invoice.find(match).populate('site', 'name').sort({ invoiceDate: -1 }).lean();
    const flat = data.map(inv => ({
      'Invoice #': inv.invoiceNumber,
      'Type': inv.invoiceType,
      'Date': inv.invoiceDate?.toISOString().split('T')[0],
      'Site': inv.site?.name,
      'Customer': inv.customer?.name || inv.customer?.company || '',
      'Supplier': inv.supplier?.name || inv.supplier?.company || '',
      'Subtotal (₹)': inv.subtotal,
      'GST (₹)': inv.gstAmount,
      'TDS (₹)': inv.tdsAmount,
      'Total (₹)': inv.totalAmount,
      'Paid (₹)': inv.paidAmount,
      'Balance (₹)': inv.balanceAmount,
      'Status': inv.paymentStatus,
    }));
    res.json({ success: true, data: flat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Advances / Transactions
router.get('/advances', async (req, res) => {
  try {
    const { site, startDate, endDate, financialYear } = req.query;
    const match = { isDeleted: false };
    if (site && site !== 'all') { const id = toObjId(site); if (id) match.site = id; }
    if (financialYear) match.financialYear = financialYear;
    Object.assign(match, buildDateRange('date', startDate, endDate));
    const data = await Transaction.find(match).populate('site', 'name').populate('party', 'name').sort({ date: -1 }).lean();
    const flat = data.map(t => ({
      'Txn #': t.transactionNumber,
      'Date': t.date?.toISOString().split('T')[0],
      'Site': t.site?.name,
      'Type': t.type,
      'Category': t.category,
      'Party': t.partyName || t.party?.name,
      'Amount (₹)': t.amount,
      'Reference': t.referenceNo || '',
      'Description': t.description || '',
    }));
    res.json({ success: true, data: flat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const data = await Vehicle.find({ isDeleted: false }).lean();
    const flat = data.map(v => ({
      'Vehicle #': v.vehicleNumber,
      'Type': v.vehicleType,
      'Ownership': v.ownership,
      'Owner': v.ownerName || '',
      'Model': v.model || '',
      'Year': v.year || '',
      'RC Number': v.rcNumber || '',
      'Driver': v.driverName || '',
      'DL Number': v.driverLicense || '',
      'Fitness Cert #': v.fitnessCertNo || '',
      'Permit #': v.permitNo || '',
      'Diesel Reading': v.presentDieselReading || '',
      'Status': v.status,
    }));
    res.json({ success: true, data: flat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Companies
router.get('/companies', async (req, res) => {
  try {
    const data = await Company.find({ isDeleted: false }).lean();
    const flat = data.map(c => ({
      'Name': c.name,
      'Type': c.type,
      'GSTIN': c.gstin || '',
      'Phone': c.phone || '',
      'Email': c.email || '',
      'City': c.city || '',
      'State': c.state || '',
      'Status': c.status || 'active',
    }));
    res.json({ success: true, data: flat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
