const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/financialYearController');

router.use(protect);
router.get('/',             ctrl.getFinancialYears);
router.post('/',            ctrl.createFinancialYear);
router.get('/current',      ctrl.getCurrentFY);
router.put('/:id',          ctrl.updateFinancialYear);
router.delete('/:id',       ctrl.deleteFinancialYear);
router.patch('/:id/lock',   ctrl.lockFY);
router.patch('/:id/unlock', ctrl.unlockFY);

module.exports = router;
