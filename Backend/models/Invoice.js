const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  billingType: { type: String },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'Ton' },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  trips: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  kilometers: { type: Number, default: 0 },
  // Supplier cost (hidden from customer invoice)
  supplierRate: { type: Number, default: 0 },
  supplierAmount: { type: Number, default: 0 },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  invoiceType: { type: String, enum: ['customer', 'supplier', 'transport', 'rental'], required: true },
  financialYear: { type: String, default: '' }, // e.g. "2025-2026"
  invoiceDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date },

  // For customer invoices
  customer: {
    name: { type: String },
    company: { type: String },
    address: { type: String },
    gstin: { type: String },
    phone: { type: String },
    email: { type: String },
  },

  // For supplier invoices
  supplier: {
    name: { type: String },
    company: { type: String },
    address: { type: String },
    gstin: { type: String },
    phone: { type: String },
  },

  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  trips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }],
  items: [invoiceItemSchema],

  // Financials
  subtotal: { type: Number, required: true },
  gstPercent: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  tdsPercent: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number },
  roundOff: { type: Number, default: 0 },

  // Internal profit (hidden, only masterAdmin/admin see)
  totalSupplierCost: { type: Number, default: 0 },
  totalVendorExpense: { type: Number, default: 0 },
  totalDieselExpense: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'overdue'],
    default: 'unpaid',
  },
  paymentHistory: [{
    amount: Number,
    date: Date,
    mode: { type: String, enum: ['cash', 'bank', 'cheque', 'upi'] },
    reference: String,
  }],

  notes: { type: String },
  terms: { type: String, default: 'Payment due within 30 days.' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto generate invoice number
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const prefix = this.invoiceType === 'customer' ? 'INV' : 'SUP';
    const count = await mongoose.model('Invoice').countDocuments({ invoiceType: this.invoiceType });
    const year = new Date().getFullYear();
    this.invoiceNumber = `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // Calculate balance
  this.balanceAmount = this.totalAmount - this.paidAmount;
  if (this.paidAmount <= 0) this.paymentStatus = 'unpaid';
  else if (this.paidAmount >= this.totalAmount) this.paymentStatus = 'paid';
  else this.paymentStatus = 'partial';

  // Profit calculation
  this.netProfit = this.subtotal - this.totalSupplierCost - this.totalVendorExpense - this.totalDieselExpense;

  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
