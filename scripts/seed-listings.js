const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const User = require('../models/User');

async function seed() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 10000,
  });

  const user = await User.findOne();
  if (!user) {
    console.error('No user found in DB. Please register at least one student account first.');
    process.exit(1);
  }

  console.log(`Associating listings with host: ${user.name} (${user.email})`);

  const sampleItems = [
    {
      title: 'Casio fx-991EX ClassWiz Scientific Calculator',
      description:
        'Solar powered 552 functions scientific calculator. Allowed in semester exams and GATE. Includes hard slip-on case.',
      category: 'gadget',
      pricePerDay: 20,
      securityDeposit: 200,
      condition: 'like_new',
      isAvailable: true,
      campus: 'NIT Durgapur',
      location: 'Hall 7 (Hostel)',
      images: [
        'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&auto=format&fit=crop&q=80',
      ],
      owner: user._id,
      status: 'active',
    },
    {
      title: 'Data Structures and Algorithms in C++ (Mark Allen Weiss)',
      description:
        'Standard textbook for CS second year. Contains highlighted chapter summaries and previous midsem question markups.',
      category: 'book',
      pricePerDay: 10,
      securityDeposit: 100,
      condition: 'good',
      isAvailable: true,
      campus: 'NIT Durgapur',
      location: 'Central Library Lobby',
      images: [
        'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?w=800&auto=format&fit=crop&q=80',
      ],
      owner: user._id,
      status: 'active',
    },
    {
      title: 'Apple iPad 10th Gen 64GB with Apple Pencil',
      description:
        '10.9-inch Liquid Retina display. Comes pre-installed with GoodNotes and Notability. Perfect for digital notes during exam week.',
      category: 'device',
      pricePerDay: 120,
      securityDeposit: 1000,
      condition: 'brand_new',
      isAvailable: true,
      campus: 'NIT Durgapur',
      location: 'Hall 5, Room 214',
      images: [
        'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80',
      ],
      owner: user._id,
      status: 'active',
    },
    {
      title: 'Arduino Uno R3 Starter Kit with 30+ Sensors',
      description:
        'Includes Uno R3 microcontroller, breadboard, jumper cables, ultrasonic sensor, servo motors, LCD display, and USB cable for mini-projects.',
      category: 'gadget',
      pricePerDay: 35,
      securityDeposit: 300,
      condition: 'good',
      isAvailable: true,
      campus: 'NIT Durgapur',
      location: 'ECE Department Quad',
      images: [
        'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800&auto=format&fit=crop&q=80',
      ],
      owner: user._id,
      status: 'active',
    },
    {
      title: 'Sony WH-1000XM4 Noise Cancelling Headphones',
      description:
        'Industry-leading noise cancellation with 30-hour battery life. Great for deep focus studying in hostel or library during exam nights.',
      category: 'gadget',
      pricePerDay: 60,
      securityDeposit: 500,
      condition: 'like_new',
      isAvailable: true,
      campus: 'NIT Durgapur',
      location: 'Hall 11',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      ],
      owner: user._id,
      status: 'active',
    },
    {
      title: 'Higher Engineering Mathematics (B.S. Grewal, 44th Edition)',
      description:
        'Essential reference for 1st and 2nd year engineering mathematics (Calculus, Linear Algebra, Differential Equations). Neat and clean condition.',
      category: 'book',
      pricePerDay: 8,
      securityDeposit: 80,
      condition: 'good',
      isAvailable: true,
      campus: 'NIT Durgapur',
      location: 'Main Academic Building',
      images: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
      ],
      owner: user._id,
      status: 'active',
    },
  ];

  await Listing.create(sampleItems);
  console.log('\x1b[32m%s\x1b[0m', '✔ SUCCESS: Inserted 6 high-quality campus rental listings into MongoDB Atlas!');
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed error:', e.message);
  process.exit(1);
});
