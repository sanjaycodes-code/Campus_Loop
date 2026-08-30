const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

function sendBookingRequest(token, payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ status: 500, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runRaceConditionTest() {
  console.log('\x1b[36m%s\x1b[0m', '=======================================================');
  console.log('\x1b[36m%s\x1b[0m', '   CONCURRENT BOOKING RACE-CONDITION CONFLICT TEST     ');
  console.log('\x1b[36m%s\x1b[0m', '=======================================================\n');

  await mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    tls: true,
    tlsAllowInvalidCertificates: true,
  });

  // 1. Ensure Host and 2 Renters exist
  let host = await User.findOne({ email: 'ksv.24u10658@nitdgp.ac.in' });
  if (!host) host = await User.findOne();

  let renterA = await User.findOne({ email: 'rohit.24u10999@nitdgp.ac.in' });
  if (!renterA) {
    renterA = await User.create({
      name: 'Rohit Kumar (Renter A)',
      email: 'rohit.24u10999@nitdgp.ac.in',
      password: 'password123',
      campus: 'NIT Durgapur',
      phone: '9876543211',
    });
  }

  let renterB = await User.findOne({ email: 'ananya.24u10888@nitdgp.ac.in' });
  if (!renterB) {
    renterB = await User.create({
      name: 'Ananya Sen (Renter B)',
      email: 'ananya.24u10888@nitdgp.ac.in',
      password: 'password123',
      campus: 'NIT Durgapur',
      phone: '9876543222',
    });
  }

  // 2. Find test listing
  let listing = await Listing.findOne({ owner: host._id });
  if (!listing) {
    console.error('No listing found to test. Run npm run seed first.');
    process.exit(1);
  }

  // Reset bookedPeriods on this listing for a clean test
  await Listing.findByIdAndUpdate(listing._id, { $set: { bookedPeriods: [] } });
  await Booking.deleteMany({ listing: listing._id });

  console.log(`Target Item: "${listing.title}" (ID: ${listing._id})`);
  console.log(`Host: ${host.name}`);
  console.log(`User A: ${renterA.name}`);
  console.log(`User B: ${renterB.name}\n`);

  // Generate tokens
  const tokenA = jwt.sign({ id: renterA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: renterB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 3. Define Overlapping Date Ranges
  // Range A: Sept 10, 2026 to Sept 15, 2026
  // Range B: Sept 12, 2026 to Sept 18, 2026 (OVERLAPS Sept 12-15!)
  const payloadA = {
    listingId: listing._id.toString(),
    startDate: '2026-09-10T00:00:00.000Z',
    endDate: '2026-09-15T00:00:00.000Z',
  };

  const payloadB = {
    listingId: listing._id.toString(),
    startDate: '2026-09-12T00:00:00.000Z',
    endDate: '2026-09-18T00:00:00.000Z',
  };

  console.log('Firing near-simultaneous concurrent requests with Promise.all()...');
  console.log(`  -> Request A: Sept 10 to Sept 15 (User: ${renterA.name})`);
  console.log(`  -> Request B: Sept 12 to Sept 18 (User: ${renterB.name})\n`);

  // Force race condition with Promise.all
  const [resA, resB] = await Promise.all([
    sendBookingRequest(tokenA, payloadA),
    sendBookingRequest(tokenB, payloadB),
  ]);

  console.log('--- API Responses Received ---');
  console.log(`Response A: Status ${resA.status}`, resA.data);
  console.log(`Response B: Status ${resB.status}`, resB.data);

  // 4. Verify API Assertions
  const statuses = [resA.status, resB.status];
  const hasOne201 = statuses.includes(201);
  const hasOne409 = statuses.includes(409);

  console.log('\n--- Race Condition Assertions ---');
  if (hasOne201 && hasOne409) {
    console.log('\x1b[32m✔ PASS: Exactly ONE request succeeded (201 Created) and ONE request was rejected (409 Conflict)!\x1b[0m');
  } else {
    console.log(`\x1b[31m✖ FAIL: Unexpected response statuses: ${statuses.join(', ')}\x1b[0m`);
  }

  // 5. Verify Database Records
  const dbBookings = await Booking.find({ listing: listing._id });
  const updatedListing = await Listing.findById(listing._id);

  console.log('\n--- Database State Verification ---');
  console.log(`Total Booking documents in DB: ${dbBookings.length} (Expected: 1)`);
  console.log(`Total reserved periods on Listing: ${updatedListing.bookedPeriods.length} (Expected: 1)`);

  if (dbBookings.length === 1 && updatedListing.bookedPeriods.length === 1) {
    console.log('\x1b[32m✔ PASS: Zero double-booking occurred. Database integrity is 100% preserved!\x1b[0m\n');
  } else {
    console.log('\x1b[31m✖ FAIL: Database has duplicate bookings or inconsistent reservation periods!\x1b[0m\n');
  }

  process.exit(0);
}

runRaceConditionTest().catch((err) => {
  console.error('Race test error:', err);
  process.exit(1);
});
