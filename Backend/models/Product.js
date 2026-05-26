const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Sand', 'Coal', 'Granite', 'Steel', 'FlyAsh', 'Construction', 'Other'],
    required: true,
  },
  description: { type: String },
  unit: { type: String, enum: ['Ton', 'KG', 'CFT', 'Unit', 'Load'], default: 'Ton' },
  purchaseRate: { type: Number, required: true },   // cost per unit
  sellingRate: { type: Number, required: true },    // selling per unit
  transportRate: { type: Number, default: 0 },      // per ton transport
  gstPercent: { type: Number, default: 18 },
  tdsPercent: { type: Number, default: 1 },
  marginPercent: {
    type: Number,
    get: function () {
      if (this.purchaseRate === 0) return 0;
      return (((this.sellingRate - this.purchaseRate) / this.purchaseRate) * 100).toFixed(2);
    },
  },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' }, // site-specific pricing
  notes: { type: String },
}, { timestamps: true, toJSON: { getters: true } });

module.exports = mongoose.model('Product', productSchema);
