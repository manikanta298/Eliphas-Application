const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, uppercase: true },

  // Hierarchy — self-referencing for unlimited levels
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  level: { type: Number, default: 1 }, // 1=district, 2=area, 3=sub-area, etc.

  // Examples:
  // Level 1: Kakinada
  // Level 2: Kakinada → Sarpavaram
  // Level 3: Kakinada → Sarpavaram → Timmapur
  // Level 4: Kakinada → Sarpavaram → Timmapur → Panasapadu

  type: {
    type: String,
    enum: ['district', 'mandal', 'village', 'area', 'sublocation', 'other'],
    default: 'area',
  },

  fullPath: { type: String }, // e.g. "Kakinada > Sarpavaram > Timmapur"
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-build fullPath before save
locationSchema.pre('save', async function (next) {
  try {
    if (this.parent) {
      const parentDoc = await mongoose.model('Location').findById(this.parent);
      if (parentDoc) {
        this.level = (parentDoc.level || 1) + 1;
        this.fullPath = `${parentDoc.fullPath || parentDoc.name} > ${this.name}`;
      }
    } else {
      this.level = 1;
      this.fullPath = this.name;
    }
  } catch (e) {
    // silently proceed
  }
  next();
});

// Auto-generate code
locationSchema.pre('save', async function (next) {
  if (!this.code) {
    const slug = this.name.toUpperCase().replace(/\s+/g, '_').slice(0, 8);
    const count = await mongoose.model('Location').countDocuments();
    this.code = `${slug}_${count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Location', locationSchema);
