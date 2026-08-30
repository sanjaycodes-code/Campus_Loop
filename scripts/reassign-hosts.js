const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');

async function reassign() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4, tls: true, tlsAllowInvalidCertificates: true });

  let rohit = await User.findOne({ email: 'rohit.24u10999@nitdgp.ac.in' });
  if (!rohit) {
    rohit = await User.create({
      name: 'Rohit Kumar',
      email: 'rohit.24u10999@nitdgp.ac.in',
      password: 'password123',
      campus: 'NIT Durgapur',
      phone: '9876543211',
    });
  }

  // Reassign iPad, Sony Headphones, and Mathematics book to Rohit
  await Listing.updateMany(
    { title: { $regex: 'iPad|Headphones|Mathematics', $options: 'i' } },
    { $set: { owner: rohit._id } }
  );

  console.log('✔ Reassigned iPad, Sony Headphones, and Maths Book to student Rohit Kumar!');
  process.exit(0);
}

reassign();
