const bcrypt = require('bcryptjs');
const User = require('./models/User');
const FuelShed = require('./models/FuelShed');

const FUEL_SHEDS = [
  { name: 'Negombo Fuel Shed', location: 'Negombo' },
  { name: 'Colombo Fuel Station', location: 'Colombo' },
  { name: 'Kandy Petrol Station', location: 'Kandy' },
  { name: 'Galle Fuel Center', location: 'Galle' },
  { name: 'Kurunegala Fuel Shed', location: 'Kurunegala' },
  { name: 'Jaffna Petrol Station', location: 'Jaffna' }
];

const seedDB = async () => {
  try {
    // Seed fuel sheds
    for (const shed of FUEL_SHEDS) {
      const exists = await FuelShed.findOne({ name: shed.name });
      if (!exists) {
        await FuelShed.create(shed);
        console.log(`⛽ Fuel shed seeded: ${shed.name}`);
      }
    }

    // Seed admin account
    const adminMobile = process.env.ADMIN_MOBILE || '0700000000';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminExists = await User.findOne({ mobile: adminMobile, role: 'admin' });
    if (!adminExists) {
      const password_hash = await bcrypt.hash(adminPassword, 12);
      await User.create({
        mobile: adminMobile,
        first_name: 'System',
        last_name: 'Admin',
        address: 'Head Office',
        password_hash,
        role: 'admin',
        is_active: true
      });
      console.log(`🔑 Admin account seeded: ${adminMobile} / ${adminPassword}`);
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

module.exports = seedDB;
