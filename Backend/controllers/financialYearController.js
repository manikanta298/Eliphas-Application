const FinancialYear = require('../models/FinancialYear');

// Get all financial years
exports.getFinancialYears = async (req, res) => {
  try {
    await FinancialYear.autoGenerate(); // ensure years exist
    const years = await FinancialYear.find().sort({ startDate: -1 });
    res.json({ success: true, data: years });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create a new financial year
exports.createFinancialYear = async (req, res) => {
  try {
    const { label, startDate, endDate, isCurrent } = req.body;
    if (!label || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'label, startDate and endDate are required' });
    }
    // Check duplicate
    const existing = await FinancialYear.findOne({ label });
    if (existing) {
      return res.status(400).json({ success: false, message: `Financial year ${label} already exists` });
    }
    const fy = await FinancialYear.create({ label, startDate, endDate, isCurrent: !!isCurrent });
    res.status(201).json({ success: true, data: fy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Update (rename) a financial year
exports.updateFinancialYear = async (req, res) => {
  try {
    const { label } = req.body;
    if (!label) return res.status(400).json({ success: false, message: 'Label is required' });
    const match = label.trim().match(/^(\d{4})-(\d{2,4})$/);
    if (!match) return res.status(400).json({ success: false, message: 'Format must be like 2025-26' });
    const existing = await FinancialYear.findOne({ label: label.trim(), _id: { $ne: req.params.id } });
    if (existing) return res.status(400).json({ success: false, message: `Financial year ${label} already exists` });
    const startYear = parseInt(match[1]);
    const endYear   = match[2].length === 2 ? parseInt(`${String(startYear).slice(0,2)}${match[2]}`) : parseInt(match[2]);
    const fy = await FinancialYear.findByIdAndUpdate(
      req.params.id,
      { label: label.trim(), startDate: `${startYear}-04-01`, endDate: `${endYear}-03-31` },
      { new: true }
    );
    if (!fy) return res.status(404).json({ success: false, message: 'Financial year not found' });
    res.json({ success: true, data: fy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Delete a financial year
exports.deleteFinancialYear = async (req, res) => {
  try {
    const fy = await FinancialYear.findById(req.params.id);
    if (!fy) return res.status(404).json({ success: false, message: 'Financial year not found' });
    if (fy.isLocked) return res.status(400).json({ success: false, message: 'Cannot delete a locked financial year' });
    await FinancialYear.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `Financial year ${fy.label} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Get current financial year
exports.getCurrentFY = async (req, res) => {
  try {
    await FinancialYear.autoGenerate();
    res.json({ success: true, data: fy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lock a financial year (Master Admin only)
exports.lockFY = async (req, res) => {
  try {
    if (!req.user.permissions.canDeleteFinancial) {
      return res.status(403).json({ success: false, message: 'Only Master Admin can lock financial years' });
    }
    const fy = await FinancialYear.findByIdAndUpdate(
      req.params.id,
      { isLocked: true },
      { new: true }
    );
    if (!fy) return res.status(404).json({ success: false, message: 'Financial year not found' });
    res.json({ success: true, data: fy, message: `FY ${fy.label} locked successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Unlock a financial year
exports.unlockFY = async (req, res) => {
  try {
    if (!req.user.permissions.canRestoreDeleted) {
      return res.status(403).json({ success: false, message: 'Only Master Admin can unlock financial years' });
    }
    const fy = await FinancialYear.findByIdAndUpdate(
      req.params.id,
      { isLocked: false },
      { new: true }
    );
    res.json({ success: true, data: fy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
