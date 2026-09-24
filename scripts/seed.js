require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
const email = (process.env.ADMIN_EMAIL || 'admin@tttoutfit.com').toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'ChangeThisStrongPassword123!';
const adminPhone = process.env.ADMIN_PHONE || '01999999999';

await User.findOneAndUpdate(
  { email },
  {
    name: process.env.ADMIN_NAME || 'TTT Outfit Admin',
    email,
    phone: adminPhone,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    isActive: true
  },
  {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  }
);
  console.log('Seed complete. Admin:', email);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
