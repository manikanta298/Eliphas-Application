const express = require('express');
const router = express.Router();
const { getDashboardStats, getProfitReport } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/stats', getDashboardStats);
router.get('/profit', getProfitReport);
module.exports = router;
