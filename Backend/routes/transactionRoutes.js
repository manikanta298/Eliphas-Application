const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/transactionController');

router.use(protect);
router.get('/',          ctrl.getTransactions);
router.get('/ledger',    ctrl.getPartyLedger);
router.get('/cash',      ctrl.getCashSummary);
router.get('/:id',       ctrl.getTransaction);
router.post('/',         ctrl.createTransaction);
router.put('/:id',       ctrl.updateTransaction);
router.delete('/:id',    ctrl.deleteTransaction);

module.exports = router;
