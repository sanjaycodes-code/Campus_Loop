const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/webhookController');

// Mounted at /api/webhooks/stripe (Receives RAW Buffer body)
router.post('/', handleStripeWebhook);

module.exports = router;
