const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

exports.getDrivers = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.site) filter.assignedSites = req.query.site;

    if (!req.user.permissions.canAccessAllSites && req.user.assignedSites?.length) {
      filter.assignedSites = { $in: req.user.assignedSites };
    }

    const drivers = await Driver.find(filter)
      .populate('assignedVehicle', 'vehicleNumber vehicleType')
      .populate('assignedSites', 'name code')
      .sort({ name: 1 });

    res.json({ success: true, data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDriver = async (req, res) => {
  try {
    const driver = await Driver.findOne({ _id: req.params.id, isDeleted: false })
      .populate('assignedVehicle', 'vehicleNumber vehicleType')
      .populate('assignedSites', 'name code');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDriver = async (req, res) => {
  try {
    const driver = await Driver.create({ ...req.body, createdBy: req.user._id });

    // If vehicle assigned, update vehicle's driverName
    if (req.body.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(req.body.assignedVehicle, {
        driverName: driver.name,
        driverPhone: driver.phone,
        driverLicense: driver.licenseNumber,
        driverLicenseExpiry: driver.licenseExpiry,
      });
    }

    res.status(201).json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    // Sync vehicle if assigned
    if (req.body.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(req.body.assignedVehicle, {
        driverName: driver.name,
        driverPhone: driver.phone,
        driverLicense: driver.licenseNumber,
      });
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    await Driver.findByIdAndUpdate(req.params.id, {
      isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id,
    });
    res.json({ success: true, message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    const statuses = ['active', 'inactive', 'on_leave'];
    const nextStatus = req.body.status || (driver.status === 'active' ? 'inactive' : 'active');
    driver.status = nextStatus;
    await driver.save();
    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
