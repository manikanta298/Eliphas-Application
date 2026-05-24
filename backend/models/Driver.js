const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverCode: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  altPhone: { type: String },
  address: { type: String },

  // License details
  licenseNumber: { type: String },
  licenseType: { type: String, enum: ['LMV', 'HMV', 'HGMV', 'HTV', 'MGV', 'Other'], default: 'HMV' },
  licenseExpiry: { type: Date },
  licenseState: { type: String },

  // Assignment
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  assignedSites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],

  // Employment details
  joiningDate: { type: Date },
  salaryType: { type: String, enum: ['daily', 'monthly', 'trip'], default: 'monthly' },
  salary: { type: Number, default: 0 },
  advanceBalance: { type: Number, default: 0 },

  // Emergency contact
  emergencyContact: { type: String },
  emergencyPhone: { type: String },

  // Status
  status: { type: String, enum: ['active', 'inactive', 'on_leave', 'terminated'], default: 'active' },

  // Documents
  aadharNumber: { type: String },
  photoUrl: { type: String },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

driverSchema.pre('save', async function (next) {
  if (!this.driverCode) {
    const count = await mongoose.model('Driver').countDocuments();
    this.driverCode = `DRV-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Driver', driverSchema);
