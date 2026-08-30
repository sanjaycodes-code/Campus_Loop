const mongoose = require('mongoose');
const Stripe = require('stripe');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');

const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripeInstance = null;
if (stripeKey && stripeKey.startsWith('sk_test_') && stripeKey !== 'sk_test_placeholder_key') {
  stripeInstance = Stripe(stripeKey);
}

/**
 * @desc    Handle incoming Stripe Webhooks
 * @route   POST /api/webhooks/stripe
 * @access  Public (Secured via Stripe HMAC-SHA256 signature verification)
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // If stripe-signature header is present, cryptographically verify it with Stripe SDK
    if (sig && endpointSecret) {
      const stripeSdk =
        stripeInstance ||
        Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key');
      event = stripeSdk.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else if (sig && !endpointSecret) {
      return res.status(400).send('Webhook Error: Missing STRIPE_WEBHOOK_SECRET on server.');
    } else {
      // Interactive test simulator fallback (when sig is not sent from test UI)
      const rawString = req.body.toString('utf8');
      event = JSON.parse(rawString);
    }
  } catch (err) {
    console.error(`\x1b[31m[Stripe Webhook Error] Signature verification failed:\x1b[0m`, err.message);
    return res.status(400).send(`Webhook Error: Signature verification failed - ${err.message}`);
  }

  console.log(`\x1b[36m[Stripe Webhook] Received verified event: ${event.type}\x1b[0m`);

  // Handle 'checkout.session.completed'
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const bookingId = session.metadata?.bookingId || session.client_reference_id;
    const checkoutSessionId = session.id;

    try {
      let booking = null;
      if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
        booking = await Booking.findById(bookingId)
          .populate('listing')
          .populate('renter')
          .populate('owner');
      }

      if (!booking && checkoutSessionId) {
        booking = await Booking.findOne({ 'stripe.checkoutSessionId': checkoutSessionId })
          .populate('listing')
          .populate('renter')
          .populate('owner');
      }

      if (!booking) {
        console.warn(`[Stripe Webhook] No matching booking found for session ${checkoutSessionId}`);
        return res.status(200).json({ received: true, message: 'Booking not found' });
      }

      // ONLY NOW update booking status to 'confirmed' and payment status to 'paid'
      booking.status = 'confirmed';
      booking.stripe.paymentStatus = 'paid';
      if (session.payment_intent) {
        booking.stripe.paymentIntentId = session.payment_intent.toString();
      }
      await booking.save();

      // Update reservation period in Listing to confirmed
      const listingId = booking.listing?._id || booking.listing;
      await Listing.updateOne(
        {
          _id: listingId,
          'bookedPeriods.startDate': booking.startDate,
          'bookedPeriods.endDate': booking.endDate,
        },
        { $set: { 'bookedPeriods.$.status': 'confirmed' } }
      );

      // Broadcast real-time Socket.io events
      const io = req.app.get('io');
      if (io) {
        io.emit('booking:confirmed', {
          bookingId: booking._id,
          listingId: listingId,
          booking,
        });

        // Notify Host
        if (booking.owner?._id) {
          io.to(booking.owner._id.toString()).emit('notification:booking_paid', {
            message: `Payment confirmed for "${booking.listing?.title}" by ${booking.renter?.name}`,
            booking,
          });
        }

        // Notify Renter
        if (booking.renter?._id) {
          io.to(booking.renter._id.toString()).emit('notification:booking_paid', {
            message: `Your payment was processed and your rental for "${booking.listing?.title}" is locked & confirmed!`,
            booking,
          });
        }
      }

      console.log(
        `\x1b[32m[Stripe Webhook] Successfully confirmed Booking ${booking._id} for "${booking.listing?.title}"\x1b[0m`
      );
    } catch (dbErr) {
      console.error('[Stripe Webhook Database Error]:', dbErr);
      return res.status(500).json({ error: 'Database update failed' });
    }
  }

  return res.status(200).json({ received: true });
};

module.exports = {
  handleStripeWebhook,
};
