const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/driverController');

router.use(protect);
router.get('/', ctrl.getDrivers);
router.get('/:id', ctrl.getDriver);
router.post('/', ctrl.createDriver);
router.put('/:id', ctrl.updateDriver);
router.patch('/:id/status', ctrl.toggleStatus);
router.delete('/:id', ctrl.deleteDriver);

module.exports = router;
