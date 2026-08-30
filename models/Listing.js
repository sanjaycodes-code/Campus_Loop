const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Listing title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Listing description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['device', 'book', 'gadget'],
        message: '{VALUE} is not a valid category. Choose from: device, book, gadget',
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Listing must belong to an owner (User)'],
      index: true,
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Price per day is required'],
      min: [0, 'Price per day cannot be negative'],
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: [0, 'Security deposit cannot be negative'],
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    condition: {
      type: String,
      enum: {
        values: ['brand_new', 'like_new', 'good', 'fair'],
        message: '{VALUE} is not a valid condition',
      },
      default: 'good',
    },
    campus: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'rented', 'inactive', 'archived'],
        message: '{VALUE} is not a valid listing status',
      },
      default: 'active',
      index: true,
    },
    // Atomic reservation periods to prevent race conditions & double booking
    bookedPeriods: [
      {
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Booking',
        },
        renter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'confirmed'],
          default: 'confirmed',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound Index: Keyword & text search on title and description
listingSchema.index({ title: 'text', description: 'text' });

// Compound Index: Marketplace filtering by campus, category, and availability
listingSchema.index({ campus: 1, category: 1, isAvailable: 1, pricePerDay: 1 });

// Compound Index: Scoped owner queries for dashboard
listingSchema.index({ owner: 1, createdAt: -1 });

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;
