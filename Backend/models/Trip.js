const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripNumber:    { type: String, unique: true },
  financialYear: { type: String, default: '' },
  site:     { type: mongoose.Schema.Types.ObjectId, ref: 'Site',     required: true },
  vehicle:  { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },   // customer company
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },   // supplier company
  driver:   { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

  tripDate: { type: Date, required: true, default: Date.now },

  // Simplified billing type — only Weight(Ton) or Fixed Contract
  billingType: {
    type: String,
    enum: ['trip', 'contract', 'perTon', 'machine', 'ton', 'fixed'],
    required: true,
    default: 'trip',
  },

  // Billing entry fields (from Add Billing form)
  clientName:          { type: String },
  companyName:         { type: String },
  phoneNumber:         { type: String },
  challanNumber:       { type: String },
  loadType:            { type: String },
  unitValue:           { type: Number, default: 0 },
  companyRate:         { type: Number, default: 0 },
  companyFare:         { type: Number, default: 0 },  // auto: companyRate × unitValue
  tripTime:            { type: String },

  // Measurements
  quantity: { type: Number, default: 0 },

  // Rates (client side)
  rateApplied: { type: Number, default: 0 },

  // Diesel
  dieselQuantity:      { type: Number, default: 0 },
  dieselPricePerLitre: { type: Number, default: 0 },

  // Supplier / purchase side
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

  // Auto-calc companyFare and dieselExpense from entry fields
  this.companyFare  = (this.companyRate || 0) * (this.unitValue || 0);
  this.dieselExpense = (this.dieselQuantity || 0) * (this.dieselPricePerLitre || 0);

  // Calculate client base amount
  const uv = this.unitValue || this.quantity || 0;
  if (['ton', 'perTon'].includes(this.billingType)) {
    this.baseAmount = (this.rateApplied || 0) * uv;
  } else if (this.billingType === 'machine') {
    this.baseAmount = (this.rateApplied || 0) * uv;
  } else {
    // trip / contract / fixed
    this.baseAmount = this.rateApplied || 0;
  }

  this.totalCustomerAmount = this.baseAmount + (this.gstAmount || 0) - (this.tdsAmount || 0);
  this.supplierCost  = (this.supplierRate || 0) * (uv || 1);
  this.netProfit     = this.baseAmount - this.supplierCost - (this.vendorExpense || 0) - (this.dieselExpense || 0);
  this.profitMargin  = this.baseAmount > 0
    ? parseFloat(((this.netProfit / this.baseAmount) * 100).toFixed(2))
    : 0;

  next();
});

module.exports = mongoose.model('Trip', tripSchema);
