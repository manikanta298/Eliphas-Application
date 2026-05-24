const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
router.use(protect, authorize('masterAdmin','admin'));
router.get('/', async (req, res) => {
  const { module, action, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (module) filter.module = module;
  if (action) filter.action = action;
  const total = await ActivityLog.countDocuments(filter);
  const logs = await ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).populate('user','name role');
  res.json({ success: true, data: logs, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
});
module.exports = router;
