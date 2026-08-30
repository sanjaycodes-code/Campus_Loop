const express = require('express');
const router = express.Router();
const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  toggleListingAvailability,
} = require('../controllers/listingController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getListings);
router.get('/:id', getListingById);

// Protected routes (require JWT)
router.post('/', protect, createListing);
router.put('/:id', protect, updateListing);
router.delete('/:id', protect, deleteListing);
router.patch('/:id/availability', protect, toggleListingAvailability);
router.patch('/:id/status', protect, toggleListingAvailability);

module.exports = router;
