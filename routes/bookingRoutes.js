const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  createCheckoutSession,
  verifyCheckoutSession,
  confirmBooking,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// All booking routes require JWT authentication
router.use(protect);

router.post('/', createBooking);
router.get('/', getBookings);
router.post('/verify-session', verifyCheckoutSession);
router.post('/:id/checkout', createCheckoutSession);
router.patch('/:id/confirm', confirmBooking);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
