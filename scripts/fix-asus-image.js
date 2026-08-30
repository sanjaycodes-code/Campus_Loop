const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');

async function fixAsusImage() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4, tls: true, tlsAllowInvalidCertificates: true });

  const updated = await Listing.findOneAndUpdate(
    { title: { $regex: 'asus', $options: 'i' } },
    {
      $set: {
        images: [
          'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
        ],
        isAvailable: true,
      },
    },
    { new: true }
  );

  console.log('✔ Updated Asus laptop listing with high-res photos:', updated?.images);
  process.exit(0);
}

fixAsusImage();
