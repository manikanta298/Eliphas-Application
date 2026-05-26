const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['masterAdmin', 'admin', 'manager', 'staff'],
    default: 'staff',
  },
  phone: { type: String },
  assignedSites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  lastLogin: { type: Date },
  permissions: {
    canViewProfit: { type: Boolean, default: false },
    canDeleteFinancial: { type: Boolean, default: false },
    canModifyInvoices: { type: Boolean, default: false },
    canViewSupplierCost: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canAccessAllSites: { type: Boolean, default: false },
    canRestoreDeleted: { type: Boolean, default: false },
    canViewActivityLogs: { type: Boolean, default: false },
  },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Set permissions based on role
userSchema.pre('save', function (next) {
  if (this.isModified('role')) {
    if (this.role === 'masterAdmin') {
      Object.keys(this.permissions).forEach(k => (this.permissions[k] = true));
    } else if (this.role === 'admin') {
      this.permissions.canViewProfit = true;
      this.permissions.canModifyInvoices = true;
      this.permissions.canViewSupplierCost = true;
      this.permissions.canManageUsers = true;
      this.permissions.canAccessAllSites = true;
      this.permissions.canViewActivityLogs = true;
    } else if (this.role === 'manager') {
      this.permissions.canModifyInvoices = true;
    }
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
