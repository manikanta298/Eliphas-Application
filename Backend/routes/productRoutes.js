const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct } = require('../controllers/crudController');
const { protect, authorize } = require('../middleware/auth');
router.use(protect);
router.get('/', getProducts);
router.post('/', authorize('masterAdmin','admin','manager'), createProduct);
router.put('/:id', authorize('masterAdmin','admin','manager'), updateProduct);
module.exports = router;
