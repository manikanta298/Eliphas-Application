const Invoice  = require('../models/Invoice');
const Trip     = require('../models/Trip');
const DieselEntry = require('../models/DieselEntry');
const Vehicle  = require('../models/Vehicle');
const Site     = require('../models/Site');
const Driver   = require('../models/Driver');
const Purchase = require('../models/Purchase');

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const { financialYear, site: siteFilter, company: companyFilter } = req.query;

    const siteAccess = req.user.permissions.canAccessAllSites
      ? {}
      : { site: { $in: req.user.assignedSites } };

    // Build FY date range
    let fyStart, fyEnd;
    if (financialYear) {
      const [startYear] = financialYear.split('-');
      fyStart = new Date(`${startYear}-04-01`);
      fyEnd   = new Date(`${Number(startYear) + 1}-03-31T23:59:59`);
    } else {
      fyStart = new Date(now.getFullYear(), now.getMonth(), 1);
      fyEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Site filter (from dashboard selector)
    const siteId = siteFilter && siteFilter !== 'all' ? siteFilter : null;
    const siteMatch = siteId ? { site: require('mongoose').Types.ObjectId(siteId) } : {};

    // ── Invoice stats ──────────────────────────────
    const invMatch = {
      invoiceType: 'customer', isDeleted: false,
      financialYear: financialYear || { $exists: true },
      ...siteAccess, ...siteMatch,
    };
    if (!financialYear) { invMatch.invoiceDate = { $gte: fyStart, $lte: fyEnd }; }

    const [currentSales, lastMonthSales, pendingInvoices] = await Promise.all([
      Invoice.aggregate([
        { $match: invMatch },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { invoiceType: 'customer', isDeleted: false, invoiceDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }, ...siteAccess } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Invoice.aggregate([
        { $match: { invoiceType: 'customer', isDeleted: false, paymentStatus: { $in: ['unpaid', 'partial'] }, ...siteAccess, ...siteMatch } },
        { $group: { _id: null, total: { $sum: '$balanceAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    // ── Purchase stats ──────────────────────────────
    const purMatch = { isDeleted: false, ...siteMatch };
    if (financialYear) purMatch.financialYear = financialYear;
    else purMatch.purchaseDate = { $gte: fyStart, $lte: fyEnd };

    const purchaseStats = await Purchase.aggregate([
      { $match: purMatch },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' }, balance: { $sum: '$balanceAmount' }, count: { $sum: 1 } } },
    ]);

    // ── Diesel stats ──────────────────────────────
    const dieselMatch = { isDeleted: false, ...siteMatch, ...siteAccess };
    if (financialYear) dieselMatch.financialYear = financialYear;
    else dieselMatch.entryDate = { $gte: fyStart, $lte: fyEnd };

    const dieselStats = await DieselEntry.aggregate([
      { $match: dieselMatch },
      { $group: { _id: null, totalLiters: { $sum: '$liters' }, totalAmount: { $sum: '$totalAmount' } } },
    ]);

    // ── Trip stats ──────────────────────────────
    const tripMatch = { isDeleted: false, ...siteAccess, ...siteMatch };
    if (financialYear) tripMatch.financialYear = financialYear;
    else tripMatch.tripDate = { $gte: fyStart, $lte: fyEnd };

    const tripStats = await Trip.aggregate([
      { $match: tripMatch },
      { $group: { _id: null, totalTrips: { $sum: 1 }, totalRevenue: { $sum: '$baseAmount' }, totalProfit: { $sum: '$netProfit' } } },
    ]);

    // ── Counts (master stats cards) ──────────────
    const [totalSites, totalVehicles, totalDrivers, totalInvoicesCount, activeVehicles, onTripVehicles] = await Promise.all([
      Site.countDocuments({ status: 'active', isDeleted: false }),
      Vehicle.countDocuments({ isDeleted: false }),
      Driver.countDocuments({ status: 'active', isDeleted: false }),
      Invoice.countDocuments({ invoiceType: 'customer', isDeleted: false }),
      Vehicle.countDocuments({ status: 'active', isDeleted: false }),
      Vehicle.countDocuments({ status: 'on_trip', isDeleted: false }),
    ]);

    // ── Monthly chart ──────────────────────────────
    const monthlyData = await Invoice.aggregate([
      {
        $match: {
          invoiceType: 'customer', isDeleted: false,
          invoiceDate: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
          ...siteAccess,
        },
      },
      { $group: { _id: { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } }, revenue: { $sum: '$totalAmount' }, collected: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // ── Site-wise revenue ──────────────────────────
    const siteRevenue = await Invoice.aggregate([
      { $match: { invoiceType: 'customer', isDeleted: false, ...invMatch } },
      { $group: { _id: '$site', revenue: { $sum: '$totalAmount' } } },
      { $lookup: { from: 'sites', localField: '_id', foreignField: '_id', as: 'siteInfo' } },
      { $unwind: { path: '$siteInfo', preserveNullAndEmptyArrays: true } },
      { $project: { siteName: '$siteInfo.name', revenue: 1 } },
      { $sort: { revenue: -1 } }, { $limit: 6 },
    ]);

    const cs  = currentSales[0]  || { total: 0, paid: 0, count: 0 };
    const ls  = lastMonthSales[0] || { total: 0 };
    const ps  = purchaseStats[0]  || { total: 0, paid: 0, balance: 0, count: 0 };
    const ds  = dieselStats[0]    || { totalLiters: 0, totalAmount: 0 };
    const ts  = tripStats[0]      || { totalTrips: 0, totalRevenue: 0, totalProfit: 0 };
    const pi  = pendingInvoices[0] || { total: 0, count: 0 };
    const salesGrowth = ls.total > 0 ? (((cs.total - ls.total) / ls.total) * 100).toFixed(1) : 0;

    const response = {
      // Master stat cards (matching image exactly)
      masterStats: {
        totalSites,
        totalVehicles,
        totalDrivers,
        totalInvoices: totalInvoicesCount,
      },
      purchase: { total: ps.total, paid: ps.paid, balance: ps.balance, count: ps.count },
      sales:    { current: cs.total, paid: cs.paid, invoiceCount: cs.count, growth: salesGrowth },
      diesel:   { liters: ds.totalLiters, amount: ds.totalAmount },
      trips:    { count: ts.totalTrips, revenue: ts.totalRevenue },
      vehicles: { active: activeVehicles, onTrip: onTripVehicles },
      pending:  { amount: pi.total, count: pi.count },
      sites:    { active: totalSites },
      charts:   { monthly: monthlyData, siteRevenue },
    };

    if (req.user.permissions.canViewProfit) {
      response.profit = { net: ts.totalProfit };
    }

    res.json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProfitReport = async (req, res) => {
  try {
    if (!req.user.permissions.canViewProfit) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { startDate, endDate, site } = req.query;
    const match = { isDeleted: false };
    if (site) match.site = require('mongoose').Types.ObjectId(site);
    if (startDate || endDate) {
      match.tripDate = {};
      if (startDate) match.tripDate.$gte = new Date(startDate);
      if (endDate) match.tripDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }
    const profitData = await Trip.aggregate([
      { $match: match },
      { $group: { _id: '$site', totalRevenue: { $sum: '$baseAmount' }, totalSupplierCost: { $sum: '$supplierCost' }, totalVendorExpense: { $sum: '$vendorExpense' }, totalDieselExpense: { $sum: '$dieselExpense' }, netProfit: { $sum: '$netProfit' }, trips: { $sum: 1 } } },
      { $lookup: { from: 'sites', localField: '_id', foreignField: '_id', as: 'site' } },
      { $unwind: { path: '$site', preserveNullAndEmptyArrays: true } },
    ]);
    res.json({ success: true, data: profitData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
