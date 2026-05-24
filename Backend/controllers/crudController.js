const Site = require('../models/Site');
const Vehicle = require('../models/Vehicle');
const Product = require('../models/Product');
const Trip = require('../models/Trip');
const Contract = require('../models/Contract');

// ─── SITE CONTROLLERS ───────────────────────────────────────────
exports.getSites = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (!req.user.permissions.canAccessAllSites) {
      filter._id = { $in: req.user.assignedSites };
    }
    if (req.query.status) filter.status = req.query.status;
    const sites = await Site.find(filter)
      .populate('manager', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: sites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createSite = async (req, res) => {
  try {
    const site = await Site.create(req.body);
    res.status(201).json({ success: true, data: site });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
    res.json({ success: true, data: site });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteSite = async (req, res) => {
  try {
    await Site.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id });
    res.json({ success: true, message: 'Site deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── VEHICLE CONTROLLERS ────────────────────────────────────────
exports.getVehicles = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.site) filter.assignedSites = req.query.site;
    if (req.query.ownership) filter.ownership = req.query.ownership;
    if (req.query.status) filter.status = req.query.status;
    const vehicles = await Vehicle.find(filter).sort({ vehicleNumber: 1 });
    res.json({ success: true, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PRODUCT CONTROLLERS ────────────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    const filter = { isDeleted: false, isActive: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.site) filter.site = req.query.site;
    const products = await Product.find(filter).sort({ category: 1, name: 1 });

    // Strip purchase rates for non-admins
    let data = products.map(p => p.toObject({ getters: true }));
    if (!req.user.permissions.canViewSupplierCost) {
      data = data.map(p => { delete p.purchaseRate; return p; });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── TRIP CONTROLLERS ────────────────────────────────────────────
exports.getTrips = async (req, res) => {
  try {
    const { site, vehicle, product, status, startDate, endDate, page = 1, limit = 50, financialYear } = req.query;
    const filter = { isDeleted: false };

    if (site) filter.site = site;
    if (vehicle) filter.vehicle = vehicle;
    if (product) filter.product = product;
    if (status) filter.status = status;
    if (financialYear) filter.financialYear = financialYear;
    if (startDate || endDate) {
      filter.tripDate = {};
      if (startDate) filter.tripDate.$gte = new Date(startDate);
      if (endDate) filter.tripDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    if (!req.user.permissions.canAccessAllSites) {
      filter.site = { $in: req.user.assignedSites };
    }

    const total = await Trip.countDocuments(filter);
    let trips = await Trip.find(filter)
      .populate('site', 'name code')
      .populate('vehicle', 'vehicleNumber vehicleType driverName')
      .populate('product', 'name category unit')
      .populate('enteredBy', 'name')
      .sort({ tripDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Strip supplier/profit fields for non-admins
    let data = trips.map(t => t.toObject());
    if (!req.user.permissions.canViewProfit) {
      data = data.map(t => {
        delete t.supplierRate; delete t.supplierCost;
        delete t.vendorExpense; delete t.dieselExpense;
        delete t.netProfit; delete t.profitMargin;
        return t;
      });
    }

    const agg = await Trip.aggregate([
      { $match: filter },
      { $group: { _id: null, totalTrips: { $sum: 1 }, totalRevenue: { $sum: '$baseAmount' }, totalQty: { $sum: '$quantity' } } },
    ]);

    res.json({
      success: true, data,
      totals: agg[0] || { totalTrips: 0, totalRevenue: 0, totalQty: 0 },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTrip = async (req, res) => {
  try {
    const trip = await Trip.create({ ...req.body, enteredBy: req.user._id });
    await trip.populate([
      { path: 'site', select: 'name code' },
      { path: 'vehicle', select: 'vehicleNumber driverName' },
      { path: 'product', select: 'name category' },
    ]);
    res.status(201).json({ success: true, data: trip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body, { new: true, runValidators: true }
    ).populate('site vehicle product', 'name vehicleNumber category');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, data: trip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    if (!req.user.permissions.canDeleteFinancial && req.user.role === 'staff') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    await Trip.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id });
    res.json({ success: true, message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CONTRACT CONTROLLERS ────────────────────────────────────────
exports.getContracts = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.site) filter.site = req.query.site;
    if (req.query.status) filter.status = req.query.status;
    const contracts = await Contract.find(filter)
      .populate('site', 'name code')
      .populate('vehicle', 'vehicleNumber')
      .populate('product', 'name category')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: contracts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createContract = async (req, res) => {
  try {
    const contract = await Contract.create({ ...req.body, createdBy: req.user._id });
    await contract.populate('site vehicle product', 'name vehicleNumber category');
    res.status(201).json({ success: true, data: contract });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateContract = async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
