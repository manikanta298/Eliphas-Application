const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/purchaseController');

router.use(protect);
router.get('/', ctrl.getPurchases);
router.get('/summary', ctrl.getPurchaseSummary);
router.get('/:id', ctrl.getPurchase);
router.post('/', ctrl.createPurchase);
router.put('/:id', ctrl.updatePurchase);
router.post('/:id/payment', ctrl.recordPayment);
router.delete('/:id', ctrl.deletePurchase);

module.exports = router;
