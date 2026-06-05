const DieselEntry = require('../models/DieselEntry');
const Vehicle = require('../models/Vehicle');

// Create diesel entry
exports.createEntry = async (req, res) => {
  try {
    const entry = await DieselEntry.create({ ...req.body, enteredBy: req.user._id });
    await entry.populate([
      { path: 'vehicle', select: 'vehicleNumber vehicleType' },
      { path: 'site', select: 'name code' },
    ]);
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get diesel entries with filters
exports.getEntries = async (req, res) => {
  try {
    const { site, vehicle, startDate, endDate, shift, page = 1, limit = 50, financialYear, search } = req.query;
    const filter = { isDeleted: false };

    if (site) filter.site = site;
    if (vehicle) filter.vehicle = vehicle;
    if (shift) filter.shift = shift;
    if (financialYear) filter.financialYear = financialYear;
    if (search) {
      const q = { $regex: search, $options: 'i' };
      filter.$or = [{ driverName: q }, { notes: q }];
    }
    if (startDate || endDate) {
      filter.entryDate = {};
      if (startDate) filter.entryDate.$gte = new Date(startDate);
      if (endDate) filter.entryDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    // Site restriction for managers
    if (req.user.role === 'manager' && !req.user.permissions.canAccessAllSites) {
      filter.site = { $in: req.user.assignedSites };
    }

    const total = await DieselEntry.countDocuments(filter);
    const entries = await DieselEntry.find(filter)
      .populate('vehicle', 'vehicleNumber vehicleType driverName')
      .populate('site', 'name code')
      .populate('enteredBy', 'name')
      .sort({ entryDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Aggregate totals
    const agg = await DieselEntry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLiters: { $sum: '$presentReading' },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: entries,
      totals: agg[0] || { totalLiters: 0, totalAmount: 0, count: 0 },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Vehicle-wise diesel summary
exports.getVehicleSummary = async (req, res) => {
  try {
    const { startDate, endDate, site } = req.query;
    const match = { isDeleted: false };
    if (site) match.site = require('mongoose').Types.ObjectId(site);
    if (startDate || endDate) {
      match.entryDate = {};
      if (startDate) match.entryDate.$gte = new Date(startDate);
      if (endDate) match.entryDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    const summary = await DieselEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$vehicle',
          totalLiters: { $sum: '$presentReading' },
          totalAmount: { $sum: '$totalAmount' },
          entries: { $sum: 1 },
          firstDate: { $min: '$entryDate' },
          lastDate: { $max: '$entryDate' },
        },
      },
      { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'vehicle' } },
      { $unwind: '$vehicle' },
      { $sort: { totalAmount: -1 } },
    ]);

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update entry
exports.updateEntry = async (req, res) => {
  try {
    const entry = await DieselEntry.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { new: true, runValidators: true }
    ).populate('vehicle', 'vehicleNumber').populate('site', 'name');
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Soft delete
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await DieselEntry.findByIdAndUpdate(req.params.id, {
      isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id,
    }, { new: true });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, message: 'Diesel entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
