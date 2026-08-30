const mongoose = require('mongoose');
const Stripe = require('stripe');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');

// Initialize Stripe instance
const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripeInstance = null;
if (stripeKey && stripeKey.startsWith('sk_test_') && stripeKey !== 'sk_test_placeholder_key') {
  stripeInstance = Stripe(stripeKey);
}

/**
 * Helper to generate a Stripe Checkout Session
 */
async function generateStripeCheckoutSession({ booking, populatedListing, req }) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const startFormatted = new Date(booking.startDate).toLocaleDateString();
  const endFormatted = new Date(booking.endDate).toLocaleDateString();
  const listingTitle = populatedListing?.title || 'Campus Rental Item';

  const validImages = (populatedListing?.images || [])
    .filter((img) => typeof img === 'string' && img.startsWith('http'))
    .slice(0, 1);

  const bookingIdStr = booking._id ? booking._id.toString() : '';

  if (stripeInstance) {
    try {
      // Real Stripe Test Mode API Call
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: req.user.email,
        client_reference_id: bookingIdStr,
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: `Campus Rental: ${listingTitle}`,
                description: `${booking.totalDays} Days Rental (${startFormatted} - ${endFormatted})`,
                images: validImages.length > 0 ? validImages : undefined,
              },
              unit_amount: Math.round(booking.totalAmount * 100),
            },
            quantity: 1,
          },
          ...(booking.securityDeposit > 0
            ? [
                {
                  price_data: {
                    currency: 'inr',
                    product_data: {
                      name: `Refundable Escrow Security Deposit`,
                      description: `Held safely in escrow for ${listingTitle}`,
                    },
                    unit_amount: Math.round(booking.securityDeposit * 100),
                  },
                  quantity: 1,
                },
              ]
            : []),
        ],
        metadata: {
          bookingId: bookingIdStr,
          listingId: (populatedListing?._id || booking.listing).toString(),
          renterId: req.user._id.toString(),
        },
        success_url: `${clientUrl}/bookings?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${clientUrl}/bookings?status=cancelled`,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (stripeErr) {
      console.warn(
        'Stripe API request failed (falling back to Test Mode Checkout Simulator):',
        stripeErr.message
      );
    }
  }

  // Interactive Stripe Test Simulator Mode Fallback
  const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const simulatedUrl = `${clientUrl}/checkout-simulator?session_id=${mockSessionId}&booking_id=${bookingIdStr}&amount=${booking.totalAmount + (booking.securityDeposit || 0)}&title=${encodeURIComponent(listingTitle)}`;
  return {
    sessionId: mockSessionId,
    url: simulatedUrl,
  };
}

/**
 * @desc    Create a new rental booking with Atomic Conflict Protection
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res) => {
  try {
    const { listingId, startDate, endDate, message } = req.body;

    // 1. Validate Input Presence
    if (!listingId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide listingId, startDate, and endDate',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 2. Validate Date Formats
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format provided for startDate or endDate',
      });
    }

    // 3. Validate Date Range Logic
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be strictly after the start date',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past',
      });
    }

    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    // 4. ATOMIC CONCURRENT RESERVATION VIA findOneAndUpdate
    // Overlap condition: existing.startDate < newEnd AND existing.endDate > newStart
    // The conditional filter ensures NO existing active reservation overlaps with [start, end].
    const reservedListing = await Listing.findOneAndUpdate(
      {
        _id: listingId,
        isAvailable: true,
        status: { $ne: 'archived' },
        owner: { $ne: req.user._id }, // Prevent self-booking
        bookedPeriods: {
          $not: {
            $elemMatch: {
              status: { $in: ['pending', 'confirmed'] },
              startDate: { $lt: end },
              endDate: { $gt: start },
            },
          },
        },
      },
      {
        $push: {
          bookedPeriods: {
            startDate: start,
            endDate: end,
            renter: req.user._id,
            status: 'confirmed',
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    // 5. Handle Conflict / Atomic Failures
    if (!reservedListing) {
      // Diagnostic check to provide precise error message
      const existingListing = await Listing.findById(listingId);

      if (!existingListing) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found',
        });
      }

      if (existingListing.owner.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot book your own listing.',
        });
      }

      if (!existingListing.isAvailable || existingListing.status === 'archived') {
        return res.status(400).json({
          success: false,
          message: 'This listing is currently not available for rental.',
        });
      }

      // If we reached here, it failed specifically because of a date conflict!
      return res.status(409).json({
        success: false,
        conflict: true,
        message: 'Booking Conflict: This item is already booked for the selected date range. Please choose different dates.',
        requestedRange: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      });
    }

    // 6. Calculate Financials
    const pricePerDay = reservedListing.pricePerDay;
    const totalAmount = pricePerDay * totalDays;
    const securityDeposit = reservedListing.securityDeposit || 0;

    const bookingId = new mongoose.Types.ObjectId();

    // 7. Generate Stripe Checkout Session (Starts in 'pending' status)
    const sessionData = await generateStripeCheckoutSession({
      booking: {
        _id: bookingId,
        startDate: start,
        endDate: end,
        totalDays,
        totalAmount,
        securityDeposit,
        listing: listingId,
      },
      populatedListing: reservedListing,
      req,
    });

    // 8. Create Permanent Booking Record in 'pending' status with Stripe session ID stored
    const booking = await Booking.create({
      _id: bookingId,
      listing: listingId,
      renter: req.user._id,
      owner: reservedListing.owner,
      startDate: start,
      endDate: end,
      totalDays,
      pricePerDay,
      totalAmount,
      securityDeposit,
      status: 'pending', // MUST REMAIN PENDING (confirmed via webhook later)
      stripe: {
        checkoutSessionId: sessionData.sessionId,
        paymentStatus: 'pending',
      },
    });

    // Update reservation with bookingId reference and pending status
    await Listing.updateOne(
      { _id: listingId, 'bookedPeriods.startDate': start, 'bookedPeriods.endDate': end },
      { $set: { 'bookedPeriods.$.bookingId': booking._id, 'bookedPeriods.$.status': 'pending' } }
    );

    const populatedBooking = await Booking.findById(booking._id)
      .populate('listing', 'title category pricePerDay securityDeposit images campus location')
      .populate('owner', 'name email campus phone')
      .populate('renter', 'name email campus phone');

    // 9. Broadcast Real-time Status and Notification via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('booking:created', {
        bookingId: booking._id,
        listingId,
        startDate: start,
        endDate: end,
      });

      // Notify host in their personal room
      io.to(reservedListing.owner.toString()).emit('notification:new_booking', {
        message: `${req.user.name} booked "${reservedListing.title}" from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
        booking: populatedBooking,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Booking created in pending status. Redirecting to Stripe Checkout...',
      booking: populatedBooking,
      sessionId: sessionData.sessionId,
      url: sessionData.url,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing booking',
      error: error.message,
    });
  }
};

/**
 * @desc    Create Stripe Checkout Session for an existing pending booking
 * @route   POST /api/bookings/:id/checkout
 * @access  Private (Renter only)
 */
const createCheckoutSession = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('listing');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.renter.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the renter can initiate payment for this booking.',
      });
    }

    const sessionData = await generateStripeCheckoutSession({
      booking,
      populatedListing: booking.listing,
      req,
    });

    // Store the Stripe Checkout Session ID on Booking and KEEP status pending
    booking.stripe.checkoutSessionId = sessionData.sessionId;
    booking.stripe.paymentStatus = 'pending';
    booking.status = 'pending'; // MUST REMAIN PENDING (do NOT mark confirmed yet)
    await booking.save();

    return res.status(200).json({
      success: true,
      sessionId: sessionData.sessionId,
      url: sessionData.url,
      booking,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating Stripe checkout session',
      error: error.message,
    });
  }
};

/**
 * @desc    Get bookings for authenticated user (as renter or owner)
 * @route   GET /api/bookings
 * @access  Private
 */
const getBookings = async (req, res) => {
  try {
    const role = req.query.role || 'all'; // 'renter', 'host', or 'all'

    let query = {};
    if (role === 'renter') {
      query.renter = req.user._id;
    } else if (role === 'host') {
      query.owner = req.user._id;
    } else {
      query.$or = [{ renter: req.user._id }, { owner: req.user._id }];
    }

    const bookings = await Booking.find(query)
      .populate('listing', 'title category pricePerDay images campus location')
      .populate('owner', 'name email campus phone')
      .populate('renter', 'name email campus phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching bookings',
      error: error.message,
    });
  }
};

/**
 * @desc    Cancel a booking and release reserved period atomically
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private
 */
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isRenter = booking.renter.toString() === req.user._id.toString();
    const isOwner = booking.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isRenter && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to cancel this booking.',
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelled by user';
    await booking.save();

    // Release atomic reservation on Listing
    await Listing.findByIdAndUpdate(booking.listing, {
      $pull: {
        bookedPeriods: {
          startDate: booking.startDate,
          endDate: booking.endDate,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully and dates released.',
      booking,
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling booking',
      error: error.message,
    });
  }
};

/**
 * @desc    Accept/Confirm a pending booking (Lister / Owner only)
 * @route   PATCH /api/bookings/:id/confirm
 * @access  Private (Owner only)
 */
const confirmBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isOwner = booking.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the item host/owner can confirm this booking.',
      });
    }

    booking.status = 'confirmed';
    await booking.save();

    // Update reservation period in Listing to confirmed
    await Listing.updateOne(
      { _id: booking.listing, 'bookedPeriods.startDate': booking.startDate, 'bookedPeriods.endDate': booking.endDate },
      { $set: { 'bookedPeriods.$.status': 'confirmed' } }
    );

    const populated = await Booking.findById(booking._id)
      .populate('listing', 'title category pricePerDay images campus location')
      .populate('owner', 'name email campus phone')
      .populate('renter', 'name email campus phone');

    // Notify renter via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(booking.renter.toString()).emit('booking:confirmed', {
        message: `Your booking for "${populated.listing.title}" was accepted by the host!`,
        booking: populated,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking request confirmed!',
      booking: populated,
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error confirming booking',
      error: error.message,
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  createCheckoutSession,
  confirmBooking,
  cancelBooking,
};
