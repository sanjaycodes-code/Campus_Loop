const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');

async function setAllAvailable() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4, tls: true, tlsAllowInvalidCertificates: true });
  await Listing.updateMany({}, { $set: { isAvailable: true, status: 'active' } });
  console.log('✔ All listings are now In Stock & Available (isAvailable: true)!');
  process.exit(0);
}

setAllAvailable();
