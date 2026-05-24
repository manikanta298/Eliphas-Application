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

// Get current financial year
exports.getCurrentFY = async (req, res) => {
  try {
    await FinancialYear.autoGenerate();
    const fy = await FinancialYear.findOne({ isCurrent: true });
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
