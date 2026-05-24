const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/locationController');

router.use(protect);
router.get('/',           ctrl.getLocations);
router.get('/tree',       ctrl.getLocationTree);
router.get('/seed',       ctrl.seedLocations);
router.get('/:id/children', ctrl.getChildren);
router.post('/',          ctrl.createLocation);
router.put('/:id',        ctrl.updateLocation);
router.delete('/:id',     ctrl.deleteLocation);

module.exports = router;
