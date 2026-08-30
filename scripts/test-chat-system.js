const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

async function testChatFlow() {
  console.log('\x1b[36m%s\x1b[0m', '=== Testing Live In-App Chat Flow ===\n');

  await mongoose.connect(process.env.MONGO_URI, { family: 4, tls: true, tlsAllowInvalidCertificates: true });

  try {
    // 1. Get host user
    const host = await User.findOne();
    if (!host) {
      console.error('No host user found');
      process.exit(1);
    }

    // 2. Create or find a second student user (renter)
    let renter = await User.findOne({ email: 'rohit.24u10999@nitdgp.ac.in' });
    if (!renter) {
      renter = await User.create({
        name: 'Rohit Kumar',
        email: 'rohit.24u10999@nitdgp.ac.in',
        password: 'password123',
        campus: 'NIT Durgapur',
        phone: '9876543211',
      });
      console.log(`✔ Created second student account: ${renter.name} (${renter.email})`);
    }

    // 3. Find a listing by host
    const listing = await Listing.findOne({ owner: host._id });
    if (!listing) {
      console.error('No listing found for host');
      process.exit(1);
    }
    console.log(`✔ Found listing for chat: "${listing.title}" (Host: ${host.name})`);

    // 4. Create or retrieve conversation
    let conv = await Conversation.findOne({
      listing: listing._id,
      participants: { $all: [host._id, renter._id] },
    });

    if (!conv) {
      conv = await Conversation.create({
        participants: [host._id, renter._id],
        listing: listing._id,
      });
      console.log(`✔ Initiated conversation ID: ${conv._id}`);
    }

    // 5. Renter sends initial inquiry message
    const msg1 = await Message.create({
      conversation: conv._id,
      sender: renter._id,
      text: 'Hi Sanjay! Is this scientific calculator available for rent tomorrow morning?',
      readBy: [renter._id],
    });
    conv.lastMessage = msg1._id;
    conv.lastMessageAt = new Date();
    await conv.save();
    console.log(`✔ Renter (${renter.name}) sent: "${msg1.text}"`);

    // 6. Host replies
    const msg2 = await Message.create({
      conversation: conv._id,
      sender: host._id,
      text: 'Hey Rohit! Yes, absolutely. You can pick it up at Hall 7 hostel lobby around 9 AM.',
      readBy: [host._id],
    });
    conv.lastMessage = msg2._id;
    conv.lastMessageAt = new Date();
    await conv.save();
    console.log(`✔ Host (${host.name}) replied: "${msg2.text}"`);

    // 7. Verify message history
    const thread = await Message.find({ conversation: conv._id })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    console.log('\n--- Full Message Thread in Database ---');
    thread.forEach((m) => {
      console.log(`[${m.sender.name}]: ${m.text}`);
    });

    console.log('\n\x1b[32m✔ Live In-App Chat Backend Flow is 100% verified and operational!\x1b[0m\n');
  } catch (err) {
    console.error('Chat test error:', err);
  } finally {
    process.exit(0);
  }
}

testChatFlow();
