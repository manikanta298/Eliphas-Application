const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, uppercase: true },
  type: {
    type: String,
    enum: ['supplier', 'customer', 'vendor', 'both'],
    required: true,
  },

  // Contact details
  contactPerson: { type: String },
  phone: { type: String },
  altPhone: { type: String },
  email: { type: String, lowercase: true },
  address: { type: String },
  city: { type: String },
  state: { type: String, default: 'Andhra Pradesh' },
  pincode: { type: String },

  // GST & Tax details
  gstin: { type: String, uppercase: true },
  pan: { type: String, uppercase: true },
  tdsApplicable: { type: Boolean, default: false },
  tdsPercent: { type: Number, default: 1 },

  // Banking details
  bankName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  branchName: { type: String },

  // Business details
  creditDays: { type: Number, default: 30 }, // payment credit period
  creditLimit: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  openingBalanceType: { type: String, enum: ['debit', 'credit'], default: 'debit' },

  // Assigned sites
  assignedSites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],

  // Status
  isActive: { type: Boolean, default: true },
  notes: { type: String },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate company code
companySchema.pre('save', async function (next) {
  if (!this.code) {
    const prefix = this.type === 'supplier' ? 'SUP' : this.type === 'customer' ? 'CUS' : 'VEN';
    const count = await mongoose.model('Company').countDocuments({ type: this.type });
    this.code = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Company', companySchema);
