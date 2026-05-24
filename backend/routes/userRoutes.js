const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
router.use(protect, authorize('masterAdmin','admin'));
router.get('/', async (req, res) => {
  const users = await User.find({}).select('-password -refreshToken').populate('assignedSites','name code');
  res.json({ success: true, data: users });
});
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: { ...user.toObject(), password: undefined } });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});
router.delete('/:id', authorize('masterAdmin'), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'User deactivated' });
});
module.exports = router;
