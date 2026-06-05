const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  vehicleType: {
    type: String,
    enum: ['Lorry', 'Truck', 'JCB', 'Crane', 'Tipper', 'Trailer', 'Machinery', 'Other'],
    required: true,
  },
  ownership: { type: String, enum: ['own', 'vendor'], required: true },

  // Owner & registration
  ownerName:    { type: String },
  model:        { type: String },
  year:         { type: Number },
  rcNumber:     { type: String },  // Registration Certificate No.

  // Driver details
  driverName:   { type: String },
  driverPhone:  { type: String },
  driverLicense: { type: String }, // DL No.

  // Compliance documents
  fitnessCertNo: { type: String },
  permitNo:      { type: String },

  // Diesel & capacity
  capacity:             { type: Number },                                       // in tons
  fuelType:             { type: String, enum: ['Diesel', 'Petrol', 'CNG', 'Electric'], default: 'Diesel' },
  presentDieselReading: { type: Number },                                       // present diesel reading in litres

  // Dates
  entryDate: { type: Date },
  exitDate:  { type: Date },

  // Assignment & status
  assignedSites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
  status: { type: String, enum: ['active', 'inactive', 'maintenance', 'on_trip'], default: 'active' },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
