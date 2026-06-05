const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, uppercase: true },
  clientCompany: { type: String, required: true },
  clientContact: { type: String },
  clientPhone: { type: String },
  clientEmail: { type: String },
  location: { type: String },
  address: { type: String },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'inactive', 'completed'], default: 'active' },
  startDate: { type: Date },
  endDate: { type: Date },
  contractValue: { type: Number, default: 0 },
  description: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate site code
siteSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await mongoose.model('Site').countDocuments();
    this.code = `SITE-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Site', siteSchema);
