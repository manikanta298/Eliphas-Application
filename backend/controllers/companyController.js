const Company = require('../models/Company');

exports.getCompanies = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    // Site restriction for managers
    if (!req.user.permissions.canAccessAllSites && req.user.assignedSites?.length) {
      filter.assignedSites = { $in: req.user.assignedSites };
    }

    const companies = await Company.find(filter)
      .populate('assignedSites', 'name code')
      .sort({ name: 1 });
    res.json({ success: true, data: companies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, isDeleted: false })
      .populate('assignedSites', 'name code');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const company = await Company.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    if (!req.user.permissions.canDeleteFinancial) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    await Company.findByIdAndUpdate(req.params.id, {
      isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id,
    });
    res.json({ success: true, message: 'Company deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    company.isActive = !company.isActive;
    await company.save();
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
