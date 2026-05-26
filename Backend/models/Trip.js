const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripNumber: { type: String, unique: true },
  financialYear: { type: String, default: '' }, // e.g. "2025-2026"
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },   // customer company
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },  // supplier company
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

  tripDate: { type: Date, required: true, default: Date.now },
  billingType: {
    type: String,
    enum: ['trip', 'ton', 'weight', 'km', 'hourly', 'daily', 'weekly', 'monthly', 'fixed', 'machineRental', 'custom'],
    required: true,
  },

  // Measurements
  quantity: { type: Number, default: 0 },   // tons/units
  weight: { type: Number, default: 0 },     // in KG
  kilometers: { type: Number, default: 0 },
  hours: { type: Number, default: 0 },
  days: { type: Number, default: 0 },

  // Rates applied
  rateApplied: { type: Number, required: true },

  // Supplier / purchase side (HIDDEN from customer)
  supplierRate: { type: Number, default: 0 },
  supplierCost: { type: Number, default: 0 },
  vendorExpense: { type: Number, default: 0 },
  dieselExpense: { type: Number, default: 0 },

  // Customer billing side
  baseAmount: { type: Number },
  gstAmount: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  totalCustomerAmount: { type: Number },

  // Profit (HIDDEN from customer/manager by default)
  netProfit: { type: Number },
  profitMargin: { type: Number },

  status: { type: String, enum: ['pending', 'completed', 'invoiced', 'cancelled'], default: 'pending' },
  driverName: { type: String },
  vehicleNumber: { type: String }, // denormalized for fast reports
  loadingPoint: { type: String },
  unloadingPoint: { type: String },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto generate trip number
tripSchema.pre('save', async function (next) {
  if (!this.tripNumber) {
    const count = await mongoose.model('Trip').countDocuments();
    this.tripNumber = `TRP-${String(count + 1).padStart(6, '0')}`;
  }

  // Auto-calculate amounts
  const billingMap = {
    trip: this.rateApplied,
    ton: this.rateApplied * this.quantity,
    weight: this.rateApplied * (this.weight / 1000),
    km: this.rateApplied * this.kilometers,
    hourly: this.rateApplied * this.hours,
    daily: this.rateApplied * this.days,
  };
  this.baseAmount = billingMap[this.billingType] || this.rateApplied;

  this.totalCustomerAmount = this.baseAmount + this.gstAmount - this.tdsAmount;
  this.supplierCost = this.supplierRate * (this.quantity || 1);
  this.netProfit = this.baseAmount - this.supplierCost - this.vendorExpense - this.dieselExpense;
  this.profitMargin = this.baseAmount > 0 ? ((this.netProfit / this.baseAmount) * 100).toFixed(2) : 0;

  next();
});

module.exports = mongoose.model('Trip', tripSchema);
