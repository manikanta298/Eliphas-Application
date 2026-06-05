const express = require('express');
const router = express.Router();
const { getContracts, createContract, updateContract } = require('../controllers/crudController');
const { protect, authorize } = require('../middleware/auth');
router.use(protect);
router.get('/', getContracts);
router.post('/', authorize('masterAdmin','admin','manager'), createContract);
router.put('/:id', authorize('masterAdmin','admin','manager'), updateContract);
module.exports = router;
