const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle_number: { type: String, required: true, trim: true },
  chassis_number: { type: String, required: true, trim: true },
  fuel_type: { type: String, enum: ['Petrol', 'Diesel'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
