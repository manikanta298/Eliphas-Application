const Purchase = require('../models/Purchase');

exports.getPurchases = async (req, res) => {
  try {
    const {
      financialYear, site, supplier, paymentStatus,
      startDate, endDate, page = 1, limit = 20,
    } = req.query;

    const filter = { isDeleted: false };
    if (financialYear) filter.financialYear = financialYear;
    if (site) filter.site = site;
    if (supplier) filter.supplier = supplier;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) filter.purchaseDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    if (!req.user.permissions.canAccessAllSites && req.user.assignedSites?.length) {
      filter.site = { $in: req.user.assignedSites };
    }

    const total = await Purchase.countDocuments(filter);
    const purchases = await Purchase.find(filter)
      .populate('supplier', 'name code')
      .populate('site', 'name code')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .populate('driver', 'name phone')
      .sort({ purchaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const agg = await Purchase.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          balanceAmount: { $sum: '$balanceAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: purchases,
      totals: agg[0] || { totalAmount: 0, paidAmount: 0, balanceAmount: 0, count: 0 },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, isDeleted: false })
      .populate('supplier', 'name code gstin address')
      .populate('site', 'name code clientCompany')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .populate('driver', 'name phone licenseNumber')
      .populate('items.product', 'name unit');
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.create({ ...req.body, createdBy: req.user._id });
    await purchase.populate('supplier site vehicle driver');
    res.status(201).json({ success: true, data: purchase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('supplier site vehicle driver');
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const { amount, mode, reference, date, notes } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });

    purchase.paidAmount += Number(amount);
    purchase.paymentHistory.push({ amount: Number(amount), mode, reference, date: date || new Date(), notes });
    await purchase.save();

    res.json({ success: true, data: purchase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    if (!req.user.permissions.canDeleteFinancial) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    await Purchase.findByIdAndUpdate(req.params.id, {
      isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id,
    });
    res.json({ success: true, message: 'Purchase deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Summary report for purchase vs payment
exports.getPurchaseSummary = async (req, res) => {
  try {
    const { financialYear, site } = req.query;
    const match = { isDeleted: false };
    if (financialYear) match.financialYear = financialYear;
    if (site) match.site = require('mongoose').Types.ObjectId(site);

    const summary = await Purchase.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          balanceAmount: { $sum: '$balanceAmount' },
        },
      },
    ]);

    const supplierWise = await Purchase.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$supplier',
          supplierName: { $first: '$supplierName' },
          totalPurchase: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          pendingAmount: { $sum: '$balanceAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPurchase: -1 } },
    ]);

    res.json({ success: true, data: { summary, supplierWise } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
