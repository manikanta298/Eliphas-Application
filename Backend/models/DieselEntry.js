const mongoose = require('mongoose');

const dieselEntrySchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  financialYear: { type: String, default: '' },
  entryDate: { type: Date, required: true, default: Date.now },
  shift: { type: String, enum: ['morning', 'evening', 'night'], default: 'morning' },

  // Opening / Closing tank level
  openingLiters: { type: Number, default: 0 },
  closingLiters: { type: Number, default: 0 },

  // Actual diesel filled / consumed
  liters: { type: Number, required: true },
  ratePerLiter: { type: Number, required: true },
  totalAmount: { type: Number },
  odometerReading: { type: Number },
  fuelStation: { type: String },
  driverName: { type: String },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

dieselEntrySchema.pre('save', function (next) {
  this.totalAmount = this.liters * this.ratePerLiter;
  // Auto-calc liters from opening/closing if provided
  if (this.openingLiters > 0 && this.closingLiters >= 0 && this.liters === 0) {
    this.liters = Math.abs(this.openingLiters - this.closingLiters);
    this.totalAmount = this.liters * this.ratePerLiter;
  }
  next();
});

module.exports = mongoose.model('DieselEntry', dieselEntrySchema);
