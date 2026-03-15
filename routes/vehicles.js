const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { authMiddleware } = require('../middleware/auth');
const { encrypt } = require('../utils/crypto');
const Vehicle = require('../models/Vehicle');
const QrCodeModel = require('../models/QrCode');
const ScanLog = require('../models/ScanLog');

// GET /api/vehicles - List user's vehicles
router.get('/', authMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    const result = [];
    for (const v of vehicles) {
      const qr = await QrCodeModel.findOne({ vehicle_id: v._id });
      result.push({
        _id: v._id,
        vehicle_number: v.vehicle_number,
        chassis_number: v.chassis_number,
        fuel_type: v.fuel_type,
        createdAt: v.createdAt,
        has_qr: !!qr
      });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vehicles.' });
  }
});

// POST /api/vehicles - Add vehicle + auto-generate QR
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { vehicle_number, chassis_number, fuel_type } = req.body;
    if (!vehicle_number || !chassis_number || !fuel_type) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!['Petrol', 'Diesel'].includes(fuel_type)) {
      return res.status(400).json({ error: 'Fuel type must be Petrol or Diesel.' });
    }

    // Check duplicate vehicle number for this user
    const existing = await Vehicle.findOne({ vehicle_number: vehicle_number.toUpperCase().trim(), user_id: req.user.id });
    if (existing) return res.status(409).json({ error: 'Vehicle number already registered.' });

    // Create vehicle
    const vehicle = await Vehicle.create({
      user_id: req.user.id,
      vehicle_number: vehicle_number.toUpperCase().trim(),
      chassis_number: chassis_number.toUpperCase().trim(),
      fuel_type
    });

    // Generate secure token & encrypt payload
    const secure_token = uuidv4();
    const payload = { vehicle_id: vehicle._id.toString(), user_id: req.user.id, secure_token };
    const encrypted_token = encrypt(payload);

    // Generate QR image as base64 PNG
    const qr_image_base64 = await QRCode.toDataURL(encrypted_token, {
      width: 300,
      margin: 2,
      color: { dark: '#0a0a1a', light: '#ffffff' }
    });

    // Save QR code record
    await QrCodeModel.create({
      vehicle_id: vehicle._id,
      user_id: req.user.id,
      encrypted_token,
      secure_token,
      qr_image_base64
    });

    res.status(201).json({
      message: 'Vehicle registered and QR code generated.',
      vehicle_id: vehicle._id,
      vehicle_number: vehicle.vehicle_number,
      fuel_type: vehicle.fuel_type
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add vehicle.' });
  }
});

// GET /api/vehicles/:id/qr - Get QR data for display
router.get('/:id/qr', authMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    const qr = await QrCodeModel.findOne({ vehicle_id: vehicle._id });
    if (!qr) return res.status(404).json({ error: 'QR code not found.' });

    res.json({
      vehicle_number: vehicle.vehicle_number,
      chassis_number: vehicle.chassis_number,
      fuel_type: vehicle.fuel_type,
      qr_image_base64: qr.qr_image_base64,
      createdAt: vehicle.createdAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch QR data.' });
  }
});

// DELETE /api/vehicles/:id - Delete vehicle + QR + scan logs
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    await ScanLog.deleteMany({ vehicle_id: vehicle._id });
    await QrCodeModel.deleteOne({ vehicle_id: vehicle._id });
    await Vehicle.deleteOne({ _id: vehicle._id });

    res.json({ message: 'Vehicle and all associated data deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

// GET /api/vehicles/scan-history - User's scan history
router.get('/scan-history', authMiddleware, async (req, res) => {
  try {
    const logs = await ScanLog.find({ user_id: req.user.id })
      .populate('vehicle_id', 'vehicle_number fuel_type')
      .populate('fuel_shed_id', 'name location')
      .sort({ scanned_at: -1 })
      .limit(50);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch scan history.' });
  }
});

module.exports = router;
