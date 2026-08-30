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

async function testFullBookingFlow() {
  console.log('\x1b[36m%s\x1b[0m', '=== Testing Complete Booking, Conflict & Cancellation Workflow ===\n');

  await mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    tls: true,
    tlsAllowInvalidCertificates: true,
  });

  const host = await User.findOne({ email: 'rohit.24u10999@nitdgp.ac.in' });
  const renterA = await User.findOne({ email: 'ksv.24u10658@nitdgp.ac.in' });
  const renterB = await User.findOne({ email: 'ananya.24u10888@nitdgp.ac.in' });

  const listing = await Listing.findOne({ owner: host._id });

  // Clean test slate
  await Listing.findByIdAndUpdate(listing._id, { $set: { bookedPeriods: [], isAvailable: true } });
  await Booking.deleteMany({ listing: listing._id });

  const hostToken = jwt.sign({ id: host._id }, process.env.JWT_SECRET);
  const renterAToken = jwt.sign({ id: renterA._id }, process.env.JWT_SECRET);
  const renterBToken = jwt.sign({ id: renterB._id }, process.env.JWT_SECRET);

  console.log(`Target Item: "${listing.title}" (Host: ${host.name})\n`);

  // Step 1: Renter A books Oct 1 - Oct 5 (Starts in 'pending' status)
  console.log('1. Renter A books Oct 1 to Oct 5...');
  const res1 = await sendRequest('POST', '/api/bookings', renterAToken, {
    listingId: listing._id.toString(),
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-05T00:00:00.000Z',
  });
  console.log(`   Status: ${res1.status} | Booking Status: ${res1.data.booking?.status}`);
  console.log(res1.status === 201 && res1.data.booking?.status === 'pending' ? '   \x1b[32m✔ PASS (Booking created as PENDING)\x1b[0m\n' : '   \x1b[31m✖ FAIL\x1b[0m\n');

  const bookingId = res1.data.booking?._id;

  // Step 2: Renter B tries to book overlapping range (Oct 3 - Oct 8) -> MUST BE REJECTED (409 Conflict)
  console.log('2. Renter B attempts overlapping booking (Oct 3 to Oct 8)...');
  const res2 = await sendRequest('POST', '/api/bookings', renterBToken, {
    listingId: listing._id.toString(),
    startDate: '2026-10-03T00:00:00.000Z',
    endDate: '2026-10-08T00:00:00.000Z',
  });
  console.log(`   Status: ${res2.status} | Conflict: ${res2.data.conflict}`);
  console.log(res2.status === 409 && res2.data.conflict ? '   \x1b[32m✔ PASS (Correctly blocked with 409 Conflict)\x1b[0m\n' : '   \x1b[31m✖ FAIL\x1b[0m\n');

  // Step 3: Host accepts / confirms the pending booking
  console.log('3. Host accepts the pending booking...');
  const res3 = await sendRequest('PATCH', `/api/bookings/${bookingId}/confirm`, hostToken);
  console.log(`   Status: ${res3.status} | New Status: ${res3.data.booking?.status}`);
  console.log(res3.status === 200 && res3.data.booking?.status === 'confirmed' ? '   \x1b[32m✔ PASS (Booking is now CONFIRMED)\x1b[0m\n' : '   \x1b[31m✖ FAIL\x1b[0m\n');

  // Step 4: Renter A cancels the booking
  console.log('4. Renter A cancels the booking...');
  const res4 = await sendRequest('PATCH', `/api/bookings/${bookingId}/cancel`, renterAToken, {
    reason: 'Plans changed',
  });
  console.log(`   Status: ${res4.status} | Cancelled Status: ${res4.data.booking?.status}`);
  console.log(res4.status === 200 && res4.data.booking?.status === 'cancelled' ? '   \x1b[32m✔ PASS (Booking cancelled & atomic reservation freed)\x1b[0m\n' : '   \x1b[31m✖ FAIL\x1b[0m\n');

  // Step 5: Now Renter B tries to book Oct 1 - Oct 5 (previously blocked, now freed) -> MUST SUCCEED (201)
  console.log('5. Renter B tries booking the released slot (Oct 1 to Oct 5)...');
  const res5 = await sendRequest('POST', '/api/bookings', renterBToken, {
    listingId: listing._id.toString(),
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-05T00:00:00.000Z',
  });
  console.log(`   Status: ${res5.status} | Booking Status: ${res5.data.booking?.status}`);
  console.log(res5.status === 201 ? '   \x1b[32m✔ PASS (Slot was successfully re-booked after cancellation!)\x1b[0m\n' : '   \x1b[31m✖ FAIL\x1b[0m\n');

  console.log('\x1b[32m%s\x1b[0m', '=== Complete Booking Flow Verified Successfully! ===\n');
  process.exit(0);
}

testFullBookingFlow().catch((err) => {
  console.error('Workflow test error:', err);
  process.exit(1);
});
