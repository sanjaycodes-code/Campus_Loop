const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

function sendRequest(method, path, token, body = null) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

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

    if (body) req.write(postData);
    req.end();
  });
}

async function testStripeCheckoutFlow() {
  console.log('\x1b[36m%s\x1b[0m', '=== Testing Stripe Test-Mode Checkout & Pending Status Storage ===\n');

  await mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    tls: true,
    tlsAllowInvalidCertificates: true,
  });

  const host = await User.findOne({ email: 'rohit.24u10999@nitdgp.ac.in' });
  const renter = await User.findOne({ email: 'ksv.24u10658@nitdgp.ac.in' });
  const listing = await Listing.findOne({ owner: host._id });

  // Clean test slate
  await Listing.findByIdAndUpdate(listing._id, { $set: { bookedPeriods: [], isAvailable: true } });
  await Booking.deleteMany({ listing: listing._id });

  const renterToken = jwt.sign({ id: renter._id }, process.env.JWT_SECRET);

  console.log(`Target Listing: "${listing.title}"`);
  console.log(`Host: ${host.name} | Renter: ${renter.name}\n`);

  // Step 1: Create Booking with Stripe Checkout Session
  console.log('1. Renter creates booking for Nov 10 to Nov 15...');
  const res = await sendRequest('POST', '/api/bookings', renterToken, {
    listingId: listing._id.toString(),
    startDate: '2026-11-10T00:00:00.000Z',
    endDate: '2026-11-15T00:00:00.000Z',
  });

  console.log(`   HTTP Status: ${res.status}`);
  console.log(`   Session ID: ${res.data.sessionId}`);
  console.log(`   Checkout URL: ${res.data.url}`);

  const bookingId = res.data.booking?._id;

  // Step 2: Database Integrity Check (Immediately after redirect, before webhook)
  console.log('\n2. Inspecting Booking Document in MongoDB immediately after checkout initiation...');
  const savedBooking = await Booking.findById(bookingId);

  console.log(`   Booking ID: ${savedBooking._id}`);
  console.log(`   Status in DB: "${savedBooking.status}" (Expected: "pending")`);
  console.log(`   Stripe Session ID in DB: "${savedBooking.stripe?.checkoutSessionId}"`);
  console.log(`   Stripe Payment Status in DB: "${savedBooking.stripe?.paymentStatus}" (Expected: "pending")`);

  const isStatusPending = savedBooking.status === 'pending';
  const hasSessionId = Boolean(savedBooking.stripe?.checkoutSessionId && savedBooking.stripe.checkoutSessionId.startsWith('cs_test_'));
  const isPaymentPending = savedBooking.stripe?.paymentStatus === 'pending';

  console.log('\n--- Assertions ---');
  if (isStatusPending && hasSessionId && isPaymentPending) {
    console.log('\x1b[32m✔ PASS: Stripe session ID is stored on Booking document!\x1b[0m');
    console.log('\x1b[32m✔ PASS: Booking status is strictly PENDING (NOT confirmed before webhook)!\x1b[0m\n');
  } else {
    console.log('\x1b[31m✖ FAIL: Assertions failed!\x1b[0m\n');
  }

  process.exit(0);
}

testStripeCheckoutFlow().catch((err) => {
  console.error('Stripe test error:', err);
  process.exit(1);
});
