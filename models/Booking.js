const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Booking must reference a Listing'],
      index: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must reference a Renter (User)'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must reference the Owner (User)'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          // 'this.startDate' is available when validating document instances
          return !this.startDate || value > this.startDate;
        },
        message: 'End date must be strictly after start date',
      },
    },
    totalDays: {
      type: Number,
      required: [true, 'Total rental days count is required'],
      min: [1, 'Rental duration must be at least 1 day'],
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Price per day at time of booking is required'],
      min: [0, 'Price per day cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total rental amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid booking status',
      },
      default: 'pending',
      index: true,
    },
    stripe: {
      paymentIntentId: {
        type: String,
        trim: true,
        default: null,
      },
      checkoutSessionId: {
        type: String,
        trim: true,
        default: null,
      },
      paymentStatus: {
        type: String,
        enum: {
          values: ['unpaid', 'pending', 'paid', 'refunded', 'failed'],
          message: '{VALUE} is not a valid payment status',
        },
        default: 'unpaid',
      },
      receiptUrl: {
        type: String,
        default: null,
      },
      clientSecret: {
        type: String,
        default: null,
      },
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexes ---

// 1. Primary compound index for Date-Range Overlap Prevention queries
bookingSchema.index({ listing: 1, status: 1, startDate: 1, endDate: 1 });

// 2. User booking queries (Renter and Owner activity dashboards)
bookingSchema.index({ renter: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });

// 3. Stripe Webhook lookup index
bookingSchema.index({ 'stripe.paymentIntentId': 1 }, { sparse: true });
bookingSchema.index({ 'stripe.checkoutSessionId': 1 }, { sparse: true });

/**
 * Static method to detect overlapping bookings for a given listing and date window.
 * Standard interval overlap condition:
 *   existing.startDate < newEndDate AND existing.endDate > newStartDate
 *
 * Excludes 'cancelled' bookings and optionally excludes a current booking ID (for updates/rescheduling).
 */
bookingSchema.statics.hasOverlap = async function ({
  listingId,
  startDate,
  endDate,
  excludeBookingId = null,
}) {
  const query = {
    listing: listingId,
    status: { $in: ['pending', 'confirmed'] }, // Overlaps only block active/confirmed slots
    startDate: { $lt: new Date(endDate) },
    endDate: { $gt: new Date(startDate) },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await this.findOne(query).select('_id startDate endDate status');
  return conflictingBooking;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
