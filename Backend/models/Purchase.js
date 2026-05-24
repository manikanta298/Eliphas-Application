const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  billingType: {
    type: String,
    enum: ['trip', 'ton', 'kg', 'unit', 'hour', 'day', 'fixed'],
    default: 'ton',
  },
  quantity: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },   // in KG
  unit: { type: String, default: 'Ton' },
  basePrice: { type: Number, required: true },
  amount: { type: Number, required: true },
});

const purchaseSchema = new mongoose.Schema({
  purchaseNumber: { type: String, unique: true },
  financialYear: { type: String, required: true }, // e.g. "2025-2026"

  // Supplier info
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  supplierName: { type: String, required: true },  // denormalized
  supplierInvoiceNo: { type: String },             // supplier's invoice number
  supplierInvoiceDate: { type: Date },

  // Site / vehicle linkage
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  vehicleNumber: { type: String },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  driverName: { type: String },

  purchaseDate: { type: Date, required: true, default: Date.now },
  items: [purchaseItemSchema],

  // Financials
  subtotal: { type: Number, required: true },
  gstPercent: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  tdsPercent: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  transportCharges: { type: Number, default: 0 },
  dieselCharges: { type: Number, default: 0 },
  otherDeductions: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid',
  },
  paymentMode: { type: String, enum: ['cash', 'online', 'cheque', 'upi', 'neft', 'rtgs'] },
  paymentHistory: [{
    amount: Number,
    mode: { type: String, enum: ['cash', 'online', 'cheque', 'upi', 'neft', 'rtgs'] },
    date: { type: Date, default: Date.now },
    reference: String,
    notes: String,
  }],

  notes: { type: String },
  status: { type: String, enum: ['draft', 'confirmed', 'cancelled'], default: 'confirmed' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseSchema.pre('save', async function (next) {
  if (!this.purchaseNumber) {
    const count = await mongoose.model('Purchase').countDocuments({
      financialYear: this.financialYear,
    });
    const fyShort = this.financialYear.split('-')[0].slice(-2) + this.financialYear.split('-')[1].slice(-2);
    this.purchaseNumber = `PUR-${fyShort}-${String(count + 1).padStart(5, '0')}`;
  }
  this.balanceAmount = this.totalAmount - this.paidAmount;
  if (this.paidAmount <= 0) this.paymentStatus = 'unpaid';
  else if (this.paidAmount >= this.totalAmount) this.paymentStatus = 'paid';
  else this.paymentStatus = 'partial';
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);
