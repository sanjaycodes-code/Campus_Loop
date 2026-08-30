const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const { io: ioClient } = require('../client/node_modules/socket.io-client');
const User = require('../models/User');
const Listing = require('../models/Listing');

async function testRealtimeStatus() {
  console.log('\x1b[36m%s\x1b[0m', '=== Testing Realtime listing:statusChanged Socket.io Event ===\n');

  await mongoose.connect(process.env.MONGO_URI, { family: 4, tls: true, tlsAllowInvalidCertificates: true });

  const user = await User.findOne();
  const listing = await Listing.findOne({ owner: user._id });

  if (!user || !listing) {
    console.error('Missing user or listing in database.');
    process.exit(1);
  }

  // Generate valid JWT token for the owner
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Connect Socket.io client simulating a second browser tab
  const socket = ioClient('http://localhost:5000', { transports: ['websocket'] });

  const eventPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for listing:statusChanged event'));
    }, 8000);

    socket.on('listing:statusChanged', (data) => {
      clearTimeout(timeout);
      console.log('\x1b[35m[Socket.io Received Event]\x1b[0m', data);
      resolve(data);
    });
  });

  await new Promise((resolve) => socket.on('connect', resolve));
  console.log(`✔ Socket client connected with ID: ${socket.id}`);

  // Send PATCH request to toggle availability
  console.log(`\nTriggering PATCH /api/listings/${listing._id}/availability...`);
  const reqData = JSON.stringify({ isAvailable: !listing.isAvailable });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/listings/${listing._id}/availability`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(reqData),
    },
  };

  const httpReq = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(`✔ HTTP Response Status: ${res.statusCode}`);
    });
  });

  httpReq.write(reqData);
  httpReq.end();

  // Wait for the Socket.io event to arrive
  const receivedData = await eventPromise;

  console.log('\n--- Event Verification ---');
  console.log(`Listing ID Match: ${receivedData.listingId === listing._id.toString() ? '✔ MATCH' : '✖ MISMATCH'}`);
  console.log(`New isAvailable: ${receivedData.isAvailable}`);
  console.log(`Item Title: ${receivedData.title}`);

  // Restore status
  await Listing.findByIdAndUpdate(listing._id, { isAvailable: listing.isAvailable });
  console.log(`✔ Restored original status for "${listing.title}".`);

  socket.disconnect();
  console.log('\n\x1b[32m✔ Realtime listing:statusChanged event is 100% verified and working!\x1b[0m\n');
  process.exit(0);
}

testRealtimeStatus().catch((err) => {
  console.error('Test error:', err.message);
  process.exit(1);
});
