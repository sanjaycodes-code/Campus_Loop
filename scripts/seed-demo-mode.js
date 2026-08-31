require('dotenv').config();
const mongoose = require('mongoose');
const { seedDemoData } = require('../utils/demoSeeder');

async function runSeeder() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campusloop';
  console.log('Connecting to MongoDB at:', mongoUri.replace(/\/\/.*@/, '//***:***@'));

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    const guestUser = await seedDemoData();
    console.log('\n=============================================');
    console.log('✅ DEMO / GUEST MODE SEEDING COMPLETE!');
    console.log('=============================================');
    console.log(`👤 Guest User:  ${guestUser.email}`);
    console.log(`🔑 Password:    DemoGuest123!`);
    console.log(`🛡️  Role:        ${guestUser.role} (isGuest: ${guestUser.isGuest})`);
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Demo seeding failed:', error);
    process.exit(1);
  }
}

runSeeder();
