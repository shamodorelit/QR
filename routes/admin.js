const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { adminMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const QrCodeModel = require('../models/QrCode');
const ScanLog = require('../models/ScanLog');
const FuelShed = require('../models/FuelShed');

// GET /api/admin/stats
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [totalUsers, totalVehicles, totalScans, sheds] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Vehicle.countDocuments(),
      ScanLog.countDocuments(),
      FuelShed.find()
    ]);
    res.json({ totalUsers, totalVehicles, totalScans, fuelSheds: sheds.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/admin/users
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password_hash')
      .sort({ createdAt: -1 });
    const result = [];
    for (const u of users) {
      const vehicleCount = await Vehicle.countDocuments({ user_id: u._id });
      result.push({ ...u.toObject(), vehicleCount });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Delete all user's scan logs, QR codes, and vehicles
    const vehicles = await Vehicle.find({ user_id: user._id });
    for (const v of vehicles) {
      await ScanLog.deleteMany({ vehicle_id: v._id });
      await QrCodeModel.deleteOne({ vehicle_id: v._id });
    }
    await Vehicle.deleteMany({ user_id: user._id });
    await User.deleteOne({ _id: user._id });

    res.json({ message: 'User and all associated data deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// PUT /api/admin/users/:id/reset - Reset password or disable account
router.put('/users/:id/reset', adminMiddleware, async (req, res) => {
  try {
    const { action, new_password } = req.body;
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (action === 'disable') {
      user.is_active = false;
      await user.save();
      return res.json({ message: 'Account disabled.' });
    }
    if (action === 'enable') {
      user.is_active = true;
      await user.save();
      return res.json({ message: 'Account enabled.' });
    }
    if (action === 'reset_password' && new_password) {
      user.password_hash = await bcrypt.hash(new_password, 12);
      user.is_active = true;
      await user.save();
      return res.json({ message: 'Password reset successfully.' });
    }
    res.status(400).json({ error: 'Invalid action.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// GET /api/admin/vehicles
router.get('/vehicles', adminMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate('user_id', 'first_name last_name mobile')
      .sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// DELETE /api/admin/vehicles/:id
router.delete('/vehicles/:id', adminMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    await ScanLog.deleteMany({ vehicle_id: vehicle._id });
    await QrCodeModel.deleteOne({ vehicle_id: vehicle._id });
    await Vehicle.deleteOne({ _id: vehicle._id });

    res.json({ message: 'Vehicle deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

// GET /api/admin/scan-logs
router.get('/scan-logs', adminMiddleware, async (req, res) => {
  try {
    const logs = await ScanLog.find()
      .populate('vehicle_id', 'vehicle_number fuel_type')
      .populate('user_id', 'first_name last_name mobile')
      .populate('fuel_shed_id', 'name location')
      .sort({ scanned_at: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scan logs.' });
  }
});

module.exports = router;
