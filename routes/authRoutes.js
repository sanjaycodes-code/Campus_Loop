const express = require('express');
const router = express.Router();
const { register, login, guestLogin, reseedDemo, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/guest-login', guestLogin);
router.post('/reseed-demo', reseedDemo);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;
