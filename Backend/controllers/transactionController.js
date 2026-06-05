const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const compact = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

exports.getTransactions = async (req, res) => {
  try {
    const { financialYear, site, type, category, partyType, startDate, endDate, page = 1, limit = 50, search } = req.query;
    const filter = { isDeleted: false };

    if (financialYear) filter.financialYear = financialYear;
    if (site) filter.site = site;
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (partyType) filter.partyType = partyType;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }
    if (search) {
      const q = { $regex: search, $options: 'i' };
      filter.$or = [{ partyName: q }, { description: q }, { transactionNumber: q }, { referenceNo: q }];
    }
    if (!req.user.permissions.canAccessAllSites && req.user.assignedSites?.length) {
      filter.site = { $in: req.user.assignedSites };
    }

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .populate('site', 'name code')
      .populate('party', 'name code type')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const agg = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Cash balance calculation
    const cashIn = agg.filter(a => ['receipt', 'advance_received'].includes(a._id)).reduce((s, a) => s + a.total, 0);
    const cashOut = agg.filter(a => ['payment', 'advance_given'].includes(a._id)).reduce((s, a) => s + a.total, 0);

    res.json({
      success: true, data: transactions,
      summary: { cashIn, cashOut, balance: cashIn - cashOut, typeBreakdown: agg },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findOne({ _id: req.params.id, isDeleted: false })
      .populate('site', 'name code')
      .populate('party', 'name code gstin')
      .populate('linkedInvoice', 'invoiceNumber totalAmount')
      .populate('linkedPurchase', 'purchaseNumber totalAmount');
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const txn = await Transaction.create(compact({ ...req.body, createdBy: req.user._id }));
    await txn.populate('site party');
    res.status(201).json({ success: true, data: txn });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('site party');
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: txn });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    if (!req.user.permissions.canDeleteFinancial) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    await Transaction.findByIdAndUpdate(req.params.id, {
      isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id,
    });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Ledger for a party
exports.getPartyLedger = async (req, res) => {
  try {
    const { partyId, financialYear } = req.query;
    const match = { isDeleted: false };
    if (partyId) match.party = new mongoose.Types.ObjectId(partyId);
    if (financialYear) match.financialYear = financialYear;

    const ledger = await Transaction.find(match).sort({ date: 1 }).populate('site', 'name');
    let runningBalance = 0;
    const withBalance = ledger.map(t => {
      const obj = t.toObject();
      if (['receipt', 'advance_received'].includes(t.type)) runningBalance += t.amount;
      else runningBalance -= t.amount;
      obj.runningBalance = runningBalance;
      return obj;
    });

    res.json({ success: true, data: withBalance, closingBalance: runningBalance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cash summary
exports.getCashSummary = async (req, res) => {
  try {
    const { financialYear, site } = req.query;
    const match = { isDeleted: false, category: 'cash' };
    if (financialYear) match.financialYear = financialYear;
    if (site) match.site = new mongoose.Types.ObjectId(site);

    const summary = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: { type: '$type', date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.date': -1 } },
    ]);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
