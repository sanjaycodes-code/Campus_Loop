const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

/**
 * Ensures or reseeds complete demo data for Guest Reviewers.
 * Returns the guest user document.
 */
async function seedDemoData() {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('DemoGuest123!', salt);
  const peerPassword = await bcrypt.hash('password123', salt);

  // 1. Ensure Guest User
  let guestUser = await User.findOne({ email: 'guest@nitdgp.ac.in' });
  if (!guestUser) {
    guestUser = await User.create({
      name: 'Guest Reviewer (Demo)',
      email: 'guest@nitdgp.ac.in',
      password: hashedPassword,
      campus: 'NIT Durgapur - Hall 3',
      phone: '+91 98765 43210',
      role: 'student',
      isVerified: true,
      isGuest: true,
    });
  } else {
    guestUser.name = 'Guest Reviewer (Demo)';
    guestUser.isGuest = true;
    guestUser.isVerified = true;
    guestUser.campus = 'NIT Durgapur - Hall 3';
    await guestUser.save();
  }

  // 2. Ensure Peer Demo User (Rohit Verma)
  let peerUser = await User.findOne({ email: 'rohit.24u10999@nitdgp.ac.in' });
  if (!peerUser) {
    peerUser = await User.create({
      name: 'Rohit Verma (ECE)',
      email: 'rohit.24u10999@nitdgp.ac.in',
      password: peerPassword,
      campus: 'NIT Durgapur - Hall 7',
      phone: '+91 91234 56789',
      role: 'student',
      isVerified: true,
      isGuest: false,
    });
  }

  // 3. Check existing demo listings
  const existingGuestListings = await Listing.find({ owner: guestUser._id });
  const existingPeerListings = await Listing.find({ owner: peerUser._id });

  let guestItem1, guestItem2, guestItem3;
  let peerItem1, peerItem2, peerItem3, peerItem4;

  if (existingGuestListings.length === 0) {
    guestItem1 = await Listing.create({
      title: 'Texas Instruments TI-84 Plus CE Graphing Calculator',
      description: 'High-resolution full-color backlit display. Perfect for Advanced Calculus, Signals & Systems, and Linear Algebra courses.',
      category: 'device',
      pricePerDay: 45,
      condition: 'like_new',
      campus: 'NIT Durgapur',
      location: 'Hall 3 / Library',
      isAvailable: true,
      status: 'active',
      images: ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&auto=format&fit=crop&q=80'],
      owner: guestUser._id,
    });

    guestItem2 = await Listing.create({
      title: 'Introduction to Algorithms (CLRS 4th Edition)',
      description: 'Comprehensive standard textbook for Data Structures and Algorithms. Highlighted key topics for semester exams and coding interviews.',
      category: 'book',
      pricePerDay: 20,
      condition: 'good',
      campus: 'NIT Durgapur',
      location: 'Hall 3, Room 214',
      isAvailable: false, // Currently rented out to peer
      status: 'active',
      images: [], // Tests intentional book placeholder illustration
      owner: guestUser._id,
    });

    guestItem3 = await Listing.create({
      title: 'Sony WH-1000XM4 Active Noise-Cancelling Headphones',
      description: 'Industry-leading noise cancellation. Ideal for late-night study sessions during mid-term and end-term exams in Central Library.',
      category: 'gadget',
      pricePerDay: 75,
      condition: 'like_new',
      campus: 'NIT Durgapur',
      location: 'Hall 3',
      isAvailable: true,
      status: 'active',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
      owner: guestUser._id,
    });
  } else {
    guestItem1 = existingGuestListings[0];
    guestItem2 = existingGuestListings[1] || existingGuestListings[0];
    guestItem3 = existingGuestListings[2] || existingGuestListings[0];
  }

  if (existingPeerListings.length === 0) {
    peerItem1 = await Listing.create({
      title: 'Casio FX-991CW ClassWiz Non-Programmable Scientific Calculator',
      description: 'Approved for all NIT Durgapur departmental exams and GATE. Includes matrix, vector, integration and numerical solver functions.',
      category: 'device',
      pricePerDay: 25,
      condition: 'like_new',
      campus: 'NIT Durgapur',
      location: 'Hall 7 / Mech Dept',
      isAvailable: true,
      status: 'active',
      images: ['https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?w=800&auto=format&fit=crop&q=80'],
      owner: peerUser._id,
    });

    peerItem2 = await Listing.create({
      title: 'Higher Engineering Mathematics - B.S. Grewal (44th Edition)',
      description: 'Standard reference book for First Year Math I & II. All exercise solutions marked.',
      category: 'book',
      pricePerDay: 15,
      condition: 'fair',
      campus: 'NIT Durgapur',
      location: 'Hall 7',
      isAvailable: true,
      status: 'active',
      images: [], // Tests intentional book placeholder illustration
      owner: peerUser._id,
    });

    peerItem3 = await Listing.create({
      title: 'Engineering Drawing Mini Drafter + Sheet Holder Tube',
      description: 'Omicron mini drafter in pristine alignment with steel clamp and water-resistant chart holder tube.',
      category: 'device',
      pricePerDay: 30,
      condition: 'good',
      campus: 'NIT Durgapur',
      location: 'Hall 7 / Workshop Block',
      isAvailable: true,
      status: 'active',
      images: ['https://images.unsplash.com/photo-1581291518655-9523c932edcf?w=800&auto=format&fit=crop&q=80'],
      owner: peerUser._id,
    });

    peerItem4 = await Listing.create({
      title: 'Raspberry Pi 4 Model B (8GB RAM) with Sensor Starter Kit',
      description: 'Includes breadboard, jumper wires, ultrasonic sensors, DHT11, and 32GB MicroSD with Raspberry Pi OS for IoT labs.',
      category: 'gadget',
      pricePerDay: 60,
      condition: 'like_new',
      campus: 'NIT Durgapur',
      location: 'Hall 7 / CS Lab',
      isAvailable: true,
      status: 'active',
      images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80'],
      owner: peerUser._id,
    });
  } else {
    peerItem1 = existingPeerListings[0];
    peerItem2 = existingPeerListings[1] || existingPeerListings[0];
    peerItem3 = existingPeerListings[2] || existingPeerListings[0];
    peerItem4 = existingPeerListings[3] || existingPeerListings[0];
  }

  // 4. Ensure Sample Demo Bookings
  const existingBookings = await Booking.find({
    $or: [{ renter: guestUser._id }, { owner: guestUser._id }],
  });

  if (existingBookings.length === 0 && peerItem1 && guestItem2) {
    const today = new Date();
    const startDate1 = new Date(today.getTime() + 86400000 * 1); // tomorrow
    const endDate1 = new Date(today.getTime() + 86400000 * 5); // 4 days

    const startDate2 = new Date(today.getTime() + 86400000 * 7);
    const endDate2 = new Date(today.getTime() + 86400000 * 12);

    // 4a. Guest as Renter (Pending Approval -> Test Stripe Checkout flow)
    await Booking.create({
      listing: peerItem1._id,
      renter: guestUser._id,
      owner: peerUser._id,
      startDate: startDate1,
      endDate: endDate1,
      totalDays: 4,
      pricePerDay: peerItem1.pricePerDay,
      totalAmount: peerItem1.pricePerDay * 4,
      status: 'pending',
      isPaid: false,
      renterNotes: 'Need this for the End-Semester Numerical Methods examination.',
    });

    // 4b. Guest as Renter (Confirmed & Paid with locked dates)
    if (peerItem4) {
      await Booking.create({
        listing: peerItem4._id,
        renter: guestUser._id,
        owner: peerUser._id,
        startDate: startDate2,
        endDate: endDate2,
        totalDays: 5,
        pricePerDay: peerItem4.pricePerDay,
        totalAmount: peerItem4.pricePerDay * 5,
        status: 'confirmed',
        isPaid: true,
        stripe: { paymentIntentId: 'pi_demo_guest_test_sample' },
        renterNotes: 'Final year IoT capstone project demonstration.',
      });
    }

    // 4c. Guest as Host (Confirmed Booking from Rohit on CLRS book)
    await Booking.create({
      listing: guestItem2._id,
      renter: peerUser._id,
      owner: guestUser._id,
      startDate: new Date(today.getTime() - 86400000 * 2), // started 2 days ago
      endDate: new Date(today.getTime() + 86400000 * 5),
      totalDays: 7,
      pricePerDay: guestItem2.pricePerDay,
      totalAmount: guestItem2.pricePerDay * 7,
      status: 'confirmed',
      isPaid: true,
      stripe: { paymentIntentId: 'pi_demo_host_sample_01' },
      renterNotes: 'Preparing for algorithmic interviews.',
    });
  }

  return guestUser;
}

module.exports = { seedDemoData };
