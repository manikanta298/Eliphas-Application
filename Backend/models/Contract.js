const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contractNumber: { type: String, unique: true },
  title: { type: String, required: true },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  billingType: {
    type: String,
    enum: ['trip', 'ton', 'weight', 'km', 'hourly', 'daily', 'weekly', 'monthly', 'fixed', 'machineRental', 'custom'],
    required: true,
  },
  rate: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  contractValue: { type: Number },
  gstPercent: { type: Number, default: 18 },
  tdsPercent: { type: Number, default: 0 },
  terms: { type: String },
  status: { type: String, enum: ['active', 'completed', 'cancelled', 'expired'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

contractSchema.pre('save', async function (next) {
  if (!this.contractNumber) {
    const count = await mongoose.model('Contract').countDocuments();
    this.contractNumber = `CON-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Contract', contractSchema);
