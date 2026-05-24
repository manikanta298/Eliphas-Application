const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true, unique: true, uppercase: true },
  vehicleType: {
    type: String,
    enum: ['Lorry', 'Truck', 'JCB', 'Crane', 'Tipper', 'Trailer', 'Machinery', 'Other'],
    required: true,
  },
  ownership: { type: String, enum: ['own', 'vendor'], required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },

  // Driver details
  driverName: { type: String },
  driverPhone: { type: String },
  driverLicense: { type: String },
  driverLicenseExpiry: { type: Date },

  // Rates
  tripRate: { type: Number, default: 0 },
  kmRate: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  dailyRate: { type: Number, default: 0 },
  weeklyRate: { type: Number, default: 0 },
  monthlyRate: { type: Number, default: 0 },
  tonRate: { type: Number, default: 0 },

  // Vehicle details
  make: { type: String },
  model: { type: String },
  year: { type: Number },
  capacity: { type: Number }, // in tons
  fuelType: { type: String, enum: ['Diesel', 'Petrol', 'CNG', 'Electric'], default: 'Diesel' },
  rc: { type: String }, // Registration Certificate
  insurance: { type: String },
  insuranceExpiry: { type: Date },

  assignedSites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
  status: { type: String, enum: ['active', 'inactive', 'maintenance', 'on_trip'], default: 'active' },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
