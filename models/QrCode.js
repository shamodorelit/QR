const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encrypted_token: { type: String, required: true },
  secure_token: { type: String, required: true },
  qr_image_base64: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('QrCode', qrCodeSchema);
