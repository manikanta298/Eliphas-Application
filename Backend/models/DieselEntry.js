const mongoose = require('mongoose');

const dieselEntrySchema = new mongoose.Schema({
  vehicle:       { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  site:          { type: mongoose.Schema.Types.ObjectId, ref: 'Site',    required: true },
  driver:        { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  financialYear: { type: String, default: '' },

  // Entry date — mandatory
  entryDate: { type: Date, required: true, default: Date.now },

  // New reading-based flow
  openingReading: { type: Number, default: 0 },   // Opening Reading (Liter / Amount)
  presentReading: { type: Number, default: 0 },   // Present Reading — actual diesel filled
  closingReading: { type: Number },               // Auto-calculated (optional override)

  // Pricing
  ratePerLiter: { type: Number, default: 0 },
  totalAmount:  { type: Number, default: 0 },

  // Optional
  odometerReading: { type: Number },
  tripLink:    { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },  // Trip/Vehicle Link
  driverName:  { type: String },
  notes:       { type: String },   // Remarks

  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Pre-save: auto-calc closing reading & total amount
dieselEntrySchema.pre('save', function (next) {
  // Auto-calc closing reading if not manually set
  if (this.openingReading > 0 && this.presentReading > 0 && !this.closingReading) {
    this.closingReading = Math.abs(this.presentReading - this.openingReading);
  }
  // Total amount based on present reading (litres filled) × rate
  if (this.presentReading > 0 && this.ratePerLiter > 0) {
    this.totalAmount = parseFloat((this.presentReading * this.ratePerLiter).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('DieselEntry', dieselEntrySchema);
