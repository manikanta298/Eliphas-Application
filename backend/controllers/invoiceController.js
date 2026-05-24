const Invoice = require('../models/Invoice');
const Trip = require('../models/Trip');

// Create customer invoice from trips
exports.createCustomerInvoice = async (req, res) => {
  try {
    const { site, tripIds, customer, gstPercent, tdsPercent, notes, terms, dueDate } = req.body;

    const trips = await Trip.find({ _id: { $in: tripIds }, isDeleted: false })
      .populate('product', 'name unit gstPercent tdsPercent');

    if (!trips.length) return res.status(400).json({ success: false, message: 'No valid trips found' });

    // Build invoice items (customer-safe, no supplier cost exposed)
    const items = trips.map(t => ({
      product: t.product?._id,
      description: `${t.product?.name || 'Material'} - ${t.billingType} (${t.tripDate?.toLocaleDateString('en-IN')})`,
      billingType: t.billingType,
      quantity: t.quantity,
      unit: t.product?.unit || 'Ton',
      rate: t.rateApplied,
      amount: t.baseAmount,
      trips: 1,
      weight: t.weight,
      kilometers: t.kilometers,
      // Internal fields (stored but not returned in customer-facing response)
      supplierRate: t.supplierRate,
      supplierAmount: t.supplierCost,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const gstAmt = (subtotal * (gstPercent || 18)) / 100;
    const tdsAmt = (subtotal * (tdsPercent || 0)) / 100;
    const totalAmount = subtotal + gstAmt - tdsAmt;

    // Hidden profit fields
    const totalSupplierCost = trips.reduce((s, t) => s + (t.supplierCost || 0), 0);
    const totalVendorExpense = trips.reduce((s, t) => s + (t.vendorExpense || 0), 0);
    const totalDieselExpense = trips.reduce((s, t) => s + (t.dieselExpense || 0), 0);

    const invoice = await Invoice.create({
      invoiceType: 'customer', site, customer,
      trips: tripIds, items,
      subtotal, gstPercent, gstAmount: gstAmt,
      tdsPercent, tdsAmount: tdsAmt,
      totalAmount,
      totalSupplierCost, totalVendorExpense, totalDieselExpense,
      dueDate, notes, terms,
      createdBy: req.user._id,
    });

    // Mark trips as invoiced
    await Trip.updateMany({ _id: { $in: tripIds } }, { status: 'invoiced' });

    await invoice.populate('site', 'name code clientCompany');
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Create supplier invoice
exports.createSupplierInvoice = async (req, res) => {
  try {
    const { site, supplier, items, gstPercent, tdsPercent, notes, dueDate } = req.body;

    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const gstAmt = (subtotal * (gstPercent || 18)) / 100;
    const tdsAmt = (subtotal * (tdsPercent || 0)) / 100;
    const totalAmount = subtotal + gstAmt - tdsAmt;

    const invoice = await Invoice.create({
      invoiceType: 'supplier', site, supplier, items,
      subtotal, gstPercent, gstAmount: gstAmt,
      tdsPercent, tdsAmount: tdsAmt,
      totalAmount, dueDate, notes,
      createdBy: req.user._id,
    });

    await invoice.populate('site', 'name code');
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get invoices with role-based field filtering
exports.getInvoices = async (req, res) => {
  try {
    const { type, site, paymentStatus, startDate, endDate, page = 1, limit = 20, financialYear } = req.query;
    const filter = { isDeleted: false };

    if (type) filter.invoiceType = type;
    if (site) filter.site = site;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (financialYear) filter.financialYear = financialYear;
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    // Supplier invoices only for admin+
    if (!req.user.permissions.canViewSupplierCost) {
      filter.invoiceType = 'customer';
    }

    // Site restriction for managers
    if (!req.user.permissions.canAccessAllSites) {
      filter.site = { $in: req.user.assignedSites };
    }

    const total = await Invoice.countDocuments(filter);
    let query = Invoice.find(filter)
      .populate('site', 'name code clientCompany')
      .populate('createdBy', 'name')
      .sort({ invoiceDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    let invoices = await query;

    // Strip profit fields for non-admin roles
    if (!req.user.permissions.canViewProfit) {
      invoices = invoices.map(inv => {
        const obj = inv.toObject();
        delete obj.totalSupplierCost;
        delete obj.totalVendorExpense;
        delete obj.totalDieselExpense;
        delete obj.netProfit;
        obj.items = obj.items?.map(item => {
          delete item.supplierRate;
          delete item.supplierAmount;
          return item;
        });
        return obj;
      });
    }

    const agg = await Invoice.aggregate([
      { $match: filter },
      { $group: { _id: null, totalAmount: { $sum: '$totalAmount' }, paidAmount: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: invoices,
      totals: agg[0] || { totalAmount: 0, paidAmount: 0, count: 0 },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single invoice
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, isDeleted: false })
      .populate('site', 'name code clientCompany address')
      .populate('trips')
      .populate('createdBy', 'name');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    let data = invoice.toObject();

    // Strip sensitive profit data for non-admins
    if (!req.user.permissions.canViewProfit) {
      delete data.totalSupplierCost;
      delete data.totalVendorExpense;
      delete data.totalDieselExpense;
      delete data.netProfit;
      data.items = data.items?.map(item => {
        delete item.supplierRate;
        delete item.supplierAmount;
        return item;
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Record payment
exports.recordPayment = async (req, res) => {
  try {
    const { amount, mode, reference, date } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.paidAmount += amount;
    invoice.paymentHistory.push({ amount, mode, reference, date: date || new Date() });
    await invoice.save();

    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Soft delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    if (!req.user.permissions.canDeleteFinancial) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to delete invoices' });
    }
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, {
      isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id,
    }, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Restore deleted invoice
exports.restoreInvoice = async (req, res) => {
  try {
    if (!req.user.permissions.canRestoreDeleted) {
      return res.status(403).json({ success: false, message: 'Only Master Admin can restore records' });
    }
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, {
      isDeleted: false, deletedAt: null, deletedBy: null,
    }, { new: true });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
