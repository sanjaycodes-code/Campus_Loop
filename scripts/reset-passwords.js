const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();
const User = require('../models/User');

async function resetPasswords() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4, tls: true, tlsAllowInvalidCertificates: true });
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  const users = await User.find({});
  for (const u of users) {
    u.password = hashedPassword;
    await u.save();
  }

  console.log('Successfully hashed and set password to "password123" for all users:');
  users.forEach((u) => console.log(` - ${u.email} (${u.name})`));
  process.exit(0);
}

resetPasswords().catch(console.error);
