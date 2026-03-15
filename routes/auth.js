const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { mobile, first_name, last_name, address, password } = req.body;
    if (!mobile || !first_name || !last_name || !address || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existing = await User.findOne({ mobile });
    if (existing) return res.status(409).json({ error: 'Mobile number already registered.' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ mobile, first_name, last_name, address, password_hash, role: 'user' });

    res.status(201).json({ message: 'Registration successful.', user_id: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ error: 'Mobile and password required.' });

    const user = await User.findOne({ mobile, role: 'user' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    if (!user.is_active) return res.status(403).json({ error: 'Account is disabled. Contact admin.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user._id, mobile: user.mobile, role: user.role, name: user.first_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, mobile: user.mobile, first_name: user.first_name, last_name: user.last_name, address: user.address }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ error: 'Mobile and password required.' });

    const user = await User.findOne({ mobile, role: 'admin' });
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid admin credentials.' });

    const token = jwt.sign(
      { id: user._id, mobile: user.mobile, role: user.role, name: user.first_name },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, admin: { id: user._id, mobile: user.mobile, name: user.first_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during admin login.' });
  }
});

module.exports = router;
