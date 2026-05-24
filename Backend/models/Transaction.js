const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionNumber: { type: String, unique: true },
  financialYear: { type: String, required: true },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },

  type: {
    type: String,
    enum: ['receipt', 'payment', 'advance_given', 'advance_received', 'adjustment'],
    required: true,
  },
  category: {
    type: String,
    enum: ['cash', 'bank', 'upi', 'cheque', 'neft', 'rtgs', 'other'],
    default: 'cash',
  },

  // Party info
  partyType: { type: String, enum: ['customer', 'supplier', 'vendor', 'driver', 'other'] },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  partyName: { type: String },

  // Linked invoice/purchase
  linkedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  linkedPurchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },

  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  referenceNo: { type: String },  // cheque no / UTR / UPI ref
  bankName: { type: String },
  description: { type: String },
  notes: { type: String },

  // Balance tracking
  openingBalance: { type: Number, default: 0 },
  closingBalance: { type: Number, default: 0 },

  status: { type: String, enum: ['pending', 'cleared', 'bounced', 'cancelled'], default: 'cleared' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

transactionSchema.pre('save', async function (next) {
  if (!this.transactionNumber) {
    const count = await mongoose.model('Transaction').countDocuments({ financialYear: this.financialYear });
    const fyShort = this.financialYear.split('-')[0].slice(-2) + this.financialYear.split('-')[1].slice(-2);
    this.transactionNumber = `TXN-${fyShort}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
