const mongoose = require('mongoose');

const fuelShedSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('FuelShed', fuelShedSchema);
