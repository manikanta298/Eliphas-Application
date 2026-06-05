const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  action: { type: String, required: true }, // CREATE, UPDATE, DELETE, LOGIN, etc.
  module: { type: String, required: true }, // Invoice, Trip, Diesel, Vehicle, etc.
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetModel: { type: String },
  description: { type: String },
  before: { type: mongoose.Schema.Types.Mixed }, // snapshot before change
  after: { type: mongoose.Schema.Types.Mixed },  // snapshot after change
  ipAddress: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
