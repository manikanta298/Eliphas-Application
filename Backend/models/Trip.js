const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripNumber:    { type: String, unique: true },
  financialYear: { type: String, default: '' },
  site:     { type: mongoose.Schema.Types.ObjectId, ref: 'Site',     required: true },
  vehicle:  { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle',  required: true },
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product',  required: true },
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },   // customer company
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },   // supplier company
  driver:   { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

  tripDate: { type: Date, required: true, default: Date.now },

  // Simplified billing type — only Weight(Ton) or Fixed Contract
  billingType: {
    type: String,
    enum: ['ton', 'fixed'],
    required: true,
    default: 'ton',
  },

  // Measurements
  quantity: { type: Number, default: 0 },   // tons (used when billingType = 'ton')

  // Rates
  rateApplied: { type: Number, required: true },

  // Supplier / purchase side (hidden from customer)
  supplierRate:   { type: Number, default: 0 },
  supplierCost:   { type: Number, default: 0 },
  vendorExpense:  { type: Number, default: 0 },
  dieselExpense:  { type: Number, default: 0 },

  // Customer billing side
  baseAmount:          { type: Number },
  gstAmount:           { type: Number, default: 0 },
  tdsAmount:           { type: Number, default: 0 },
  totalCustomerAmount: { type: Number },

  // Profit (hidden from customer/manager by default)
  netProfit:    { type: Number },
  profitMargin: { type: Number },

  // Status — kept for invoicing workflow (not shown to regular users)
  status: {
    type: String,
    enum: ['pending', 'completed', 'invoiced', 'cancelled'],
    default: 'pending',
  },

  driverName:      { type: String },
  vehicleNumber:   { type: String }, // denormalized for fast reports
  loadingPoint:    { type: String },
  unloadingPoint:  { type: String },
  enteredBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isDeleted:  { type: Boolean, default: false },
  deletedAt:  { type: Date },
  deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto generate trip number + calculate amounts
tripSchema.pre('save', async function (next) {
  if (!this.tripNumber) {
    const count = await mongoose.model('Trip').countDocuments();
    this.tripNumber = `TRP-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate base amount
  if (this.billingType === 'ton') {
    this.baseAmount = this.rateApplied * (this.quantity || 0);
  } else {
    // fixed
    this.baseAmount = this.rateApplied;
  }

  this.totalCustomerAmount = this.baseAmount + (this.gstAmount || 0) - (this.tdsAmount || 0);
  this.supplierCost  = this.supplierRate * (this.quantity || 1);
  this.netProfit     = this.baseAmount - this.supplierCost - (this.vendorExpense || 0) - (this.dieselExpense || 0);
  this.profitMargin  = this.baseAmount > 0
    ? parseFloat(((this.netProfit / this.baseAmount) * 100).toFixed(2))
    : 0;

  next();
});

module.exports = mongoose.model('Trip', tripSchema);
