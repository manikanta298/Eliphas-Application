const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Trip = require('../models/Trip');
const DieselEntry = require('../models/DieselEntry');
const Invoice = require('../models/Invoice');
router.use(protect);
router.get('/trips', async (req, res) => {
  const { site, startDate, endDate } = req.query;
  const match = { isDeleted: false };
  if (site) match.site = require('mongoose').Types.ObjectId(site);
  if (startDate || endDate) { match.tripDate = {}; if (startDate) match.tripDate.$gte = new Date(startDate); if (endDate) match.tripDate.$lte = new Date(endDate); }
  const data = await Trip.find(match).populate('site vehicle product', 'name vehicleNumber category').sort({ tripDate: -1 });
  res.json({ success: true, data });
});
router.get('/diesel', async (req, res) => {
  const { site, startDate, endDate } = req.query;
  const match = { isDeleted: false };
  if (site) match.site = require('mongoose').Types.ObjectId(site);
  if (startDate || endDate) { match.entryDate = {}; if (startDate) match.entryDate.$gte = new Date(startDate); if (endDate) match.entryDate.$lte = new Date(endDate); }
  const data = await DieselEntry.find(match).populate('vehicle site', 'vehicleNumber name');
  res.json({ success: true, data });
});
module.exports = router;
