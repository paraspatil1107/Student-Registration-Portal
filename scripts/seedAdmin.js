require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');

const seedAdmin = async () => {
  await connectDB();

  const existingAdmin = await User.findOne({ email: 'admin@college.edu' });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.create({
      name: 'System Admin',
      email: 'admin@college.edu',
      password: hashedPassword,
      role: 'admin',
    });

    console.log('Admin seeded successfully.');
  } else {
    console.log('Admin already exists.');
  }

  process.exit();
};

seedAdmin();
