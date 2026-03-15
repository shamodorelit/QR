const express = require('express');
const router = express.Router();
const { decrypt } = require('../utils/crypto');
const QrCodeModel = require('../models/QrCode');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const FuelShed = require('../models/FuelShed');
const ScanLog = require('../models/ScanLog');

// GET /api/fuel-sheds - Public list of fuel sheds
router.get('/fuel-sheds', async (req, res) => {
  try {
    const sheds = await FuelShed.find().sort({ name: 1 });
    res.json(sheds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fuel sheds.' });
  }
});

// POST /api/scan/verify - Verify scanned QR, log scan
router.post('/verify', async (req, res) => {
  try {
    const { encrypted_data, fuel_shed_id } = req.body;
    if (!encrypted_data || !fuel_shed_id) {
      return res.status(400).json({ error: 'QR data and fuel shed are required.' });
    }

    // Step 1: Decrypt QR payload
    let payload;
    try {
      payload = decrypt(encrypted_data);
    } catch (decryptErr) {
      return res.status(400).json({ valid: false, error: 'INVALID QR CODE', message: 'QR code cannot be decrypted. Possible fake or tampered QR.' });
    }

    const { vehicle_id, user_id, secure_token } = payload;

    // Step 2: Validate QR record in DB
    const qrRecord = await QrCodeModel.findOne({ vehicle_id, user_id, secure_token });
    if (!qrRecord) {
      return res.status(400).json({ valid: false, error: 'INVALID QR CODE', message: 'QR code not found in database. VEHICLE NOT REGISTERED.' });
    }

    // Step 3: Fetch vehicle
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      return res.status(400).json({ valid: false, error: 'INVALID QR CODE', message: 'Vehicle record not found.' });
    }

    // Step 4: Fetch owner
    const owner = await User.findById(user_id);
    if (!owner) {
      return res.status(400).json({ valid: false, error: 'INVALID QR CODE', message: 'Vehicle owner not found.' });
    }

    // Step 5: Validate fuel shed
    const shed = await FuelShed.findById(fuel_shed_id);
    if (!shed) {
      return res.status(400).json({ error: 'Invalid fuel shed selected.' });
    }

    // Step 6: Log scan
    await ScanLog.create({
      vehicle_id: vehicle._id,
      user_id: owner._id,
      fuel_shed_id: shed._id,
      scanned_at: new Date()
    });

    res.json({
      valid: true,
      vehicle: {
        vehicle_number: vehicle.vehicle_number,
        fuel_type: vehicle.fuel_type,
        chassis_number: vehicle.chassis_number
      },
      owner: {
        name: `${owner.first_name} ${owner.last_name}`,
        mobile: owner.mobile
      },
      fuel_shed: shed.name,
      scanned_at: new Date().toISOString()
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during scan verification.' });
  }
});

module.exports = router;
