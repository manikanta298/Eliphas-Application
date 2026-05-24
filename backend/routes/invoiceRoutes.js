const express = require('express');
const router = express.Router();
const {
  createCustomerInvoice, createSupplierInvoice, getInvoices,
  getInvoice, recordPayment, deleteInvoice, restoreInvoice,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');
router.use(protect);
router.get('/', getInvoices);
router.get('/:id', getInvoice);
router.post('/customer', authorize('masterAdmin','admin','manager'), createCustomerInvoice);
router.post('/supplier', authorize('masterAdmin','admin'), createSupplierInvoice);
router.post('/:id/payment', authorize('masterAdmin','admin','manager'), recordPayment);
router.delete('/:id', deleteInvoice);
router.put('/:id/restore', restoreInvoice);
module.exports = router;
