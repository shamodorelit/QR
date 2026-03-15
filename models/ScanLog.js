const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fuel_shed_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FuelShed', required: true },
  scanned_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ScanLog', scanLogSchema);
