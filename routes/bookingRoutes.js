const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  createCheckoutSession,
  confirmBooking,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// All booking routes require JWT authentication
router.use(protect);

router.post('/', createBooking);
router.get('/', getBookings);
router.post('/:id/checkout', createCheckoutSession);
router.patch('/:id/confirm', confirmBooking);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
