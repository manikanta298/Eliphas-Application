const mongoose = require('mongoose');

const financialYearSchema = new mongoose.Schema({
  label: { type: String, required: true, unique: true }, // e.g. "2025-2026"
  startDate: { type: Date, required: true },             // April 1
  endDate: { type: Date, required: true },               // March 31
  isActive: { type: Boolean, default: false },
  isCurrent: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false },           // lock previous years
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate Financial Years for next N years
financialYearSchema.statics.autoGenerate = async function () {
  const currentDate = new Date();
  const currentCalYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  // Current FY starts in April; if month < 4, FY started previous year
  const currentFYStart = currentMonth >= 4 ? currentCalYear : currentCalYear - 1;

  // Generate FYs: previous + current + next 2
  const years = [currentFYStart - 1, currentFYStart, currentFYStart + 1, currentFYStart + 2];

  for (const startYear of years) {
    const label = `${startYear}-${startYear + 1}`;
    const exists = await this.findOne({ label });
    if (!exists) {
      await this.create({
        label,
        startDate: new Date(`${startYear}-04-01`),
        endDate: new Date(`${startYear + 1}-03-31`),
        isActive: startYear === currentFYStart,
        isCurrent: startYear === currentFYStart,
      });
    }
  }

  // Ensure current FY is marked
  await this.updateMany({ isCurrent: true }, { isCurrent: false });
  const curLabel = `${currentFYStart}-${currentFYStart + 1}`;
  await this.findOneAndUpdate({ label: curLabel }, { isCurrent: true, isActive: true });
};

module.exports = mongoose.model('FinancialYear', financialYearSchema);
