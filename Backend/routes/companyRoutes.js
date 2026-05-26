const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/companyController');

router.use(protect);
router.get('/', ctrl.getCompanies);
router.get('/:id', ctrl.getCompany);
router.post('/', ctrl.createCompany);
router.put('/:id', ctrl.updateCompany);
router.patch('/:id/toggle-status', ctrl.toggleStatus);
router.delete('/:id', ctrl.deleteCompany);

module.exports = router;
