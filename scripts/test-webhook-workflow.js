const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

// Helper to send raw POST requests
function sendRawRequest(path, rawBuffer, headers = {}) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(rawBuffer),
        ...headers,
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

    req.write(rawBuffer);
    req.end();
  });
}

/**
 * Generate official Stripe HMAC-SHA256 signature header
 */
function generateStripeSignature(payloadString, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const signedPayload = `${timestamp}.${payloadString}`;
  const hmac = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

async function runWebhookTests() {
  console.log('\x1b[36m%s\x1b[0m', '=======================================================');
  console.log('\x1b[36m%s\x1b[0m', '  STRIPE WEBHOOK VERIFICATION & SECURITY TEST SUITE   ');
  console.log('\x1b[36m%s\x1b[0m', '=======================================================\n');

  await mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    tls: true,
    tlsAllowInvalidCertificates: true,
  });

  const testSecret =
    process.env.STRIPE_WEBHOOK_SECRET ||
    'whsec_d1ec871d5155724cb8e80f1acf067b70699bddab8c42a9302b073c0439ac4cb4';

  const host = await User.findOne({ email: 'rohit.24u10999@nitdgp.ac.in' });
  const renter = await User.findOne({ email: 'ksv.24u10658@nitdgp.ac.in' });
  const listing = await Listing.findOne({ owner: host._id });

  // Create a clean pending booking
  const startDate = new Date('2026-12-01T00:00:00.000Z');
  const endDate = new Date('2026-12-05T00:00:00.000Z');
  const testSessionId = `cs_test_${Date.now()}_webhook_verify`;

  await Listing.findByIdAndUpdate(listing._id, {
    $pull: { bookedPeriods: { startDate, endDate } },
  });
  await Booking.deleteMany({ listing: listing._id, startDate, endDate });

  const booking = await Booking.create({
    listing: listing._id,
    renter: renter._id,
    owner: host._id,
    startDate,
    endDate,
    totalDays: 4,
    pricePerDay: listing.pricePerDay || 20,
    totalAmount: (listing.pricePerDay || 20) * 4,
    securityDeposit: listing.securityDeposit || 50,
    status: 'pending', // Starts pending
    stripe: {
      checkoutSessionId: testSessionId,
      paymentStatus: 'pending',
    },
  });

  await Listing.findByIdAndUpdate(listing._id, {
    $push: {
      bookedPeriods: {
        bookingId: booking._id,
        renter: renter._id,
        startDate,
        endDate,
        status: 'pending',
      },
    },
  });

  console.log(`Created Pending Booking: ${booking._id}`);
  console.log(`Initial Status: "${booking.status}" | Session ID: "${testSessionId}"\n`);

  // --- TEST 1: Tampered / Bad Signature Attack ---
  console.log('--- TEST 1: Tampered / Forged Signature Attack ---');
  const fakeEventPayload = JSON.stringify({
    id: `evt_fake_${Date.now()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: testSessionId,
        client_reference_id: booking._id.toString(),
        payment_intent: 'pi_test_fake_123',
      },
    },
  });

  const badSignatureHeader = 't=1234567890,v1=9999999999999999999999999999999999999999999999999999999999999999';

  console.log('Sending forged webhook with fake signature...');
  const badRes = await sendRawRequest('/api/webhooks/stripe', Buffer.from(fakeEventPayload, 'utf8'), {
    'stripe-signature': badSignatureHeader,
  });

  console.log(`Response Status: ${badRes.status} (Expected: 400 Bad Request)`);
  const isAttackBlocked = badRes.status === 400;

  const bookingAfterAttack = await Booking.findById(booking._id);
  console.log(`Booking Status after attack: "${bookingAfterAttack.status}" (Must still be "pending")`);

  if (isAttackBlocked && bookingAfterAttack.status === 'pending') {
    console.log('\x1b[32m✔ PASS: Bad signature was rejected (HTTP 400) and booking remained unconfirmed!\x1b[0m\n');
  } else {
    console.log('\x1b[31m✖ FAIL: Tampered signature was not blocked!\x1b[0m\n');
  }

  // --- TEST 2: Valid Authenticated Stripe Webhook ---
  console.log('--- TEST 2: Valid Authenticated Stripe Webhook ---');
  const validEventPayload = JSON.stringify({
    id: `evt_valid_${Date.now()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: testSessionId,
        client_reference_id: booking._id.toString(),
        payment_intent: 'pi_test_confirmed_98765',
        payment_status: 'paid',
        metadata: {
          bookingId: booking._id.toString(),
          listingId: listing._id.toString(),
        },
      },
    },
  });

  console.log('Generating valid HMAC-SHA256 signature for raw byte stream...');
  const stripeHelper = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key');
  const validSignature = stripeHelper.webhooks.generateTestHeaderString({
    payload: validEventPayload,
    secret: testSecret,
  });

  console.log('Sending verified webhook event...');
  const validRes = await sendRawRequest(
    '/api/webhooks/stripe',
    Buffer.from(validEventPayload, 'utf8'),
    {
      'stripe-signature': validSignature,
    }
  );

  console.log(`Response Status: ${validRes.status} (Expected: 200 OK)`);

  // Verify Database State
  const confirmedBooking = await Booking.findById(booking._id);
  const updatedListing = await Listing.findById(listing._id);
  const reservedSlot = updatedListing.bookedPeriods.find(
    (p) => p.startDate.getTime() === startDate.getTime()
  );

  console.log('\n--- Final Database Verification ---');
  console.log(`Booking Status: "${confirmedBooking.status}" (Expected: "confirmed")`);
  console.log(`Payment Status: "${confirmedBooking.stripe?.paymentStatus}" (Expected: "paid")`);
  console.log(`Payment Intent: "${confirmedBooking.stripe?.paymentIntentId}"`);
  console.log(`Listing Period Status: "${reservedSlot?.status}" (Expected: "confirmed")`);

  if (
    validRes.status === 200 &&
    confirmedBooking.status === 'confirmed' &&
    confirmedBooking.stripe?.paymentStatus === 'paid' &&
    reservedSlot?.status === 'confirmed'
  ) {
    console.log('\x1b[32m✔ PASS: Webhook verified signature and updated Booking to CONFIRMED & PAID!\x1b[0m\n');
  } else {
    console.log('\x1b[31m✖ FAIL: Webhook failed to confirm booking in database!\x1b[0m\n');
  }

  process.exit(0);
}

runWebhookTests().catch((err) => {
  console.error('Webhook test error:', err);
  process.exit(1);
});
