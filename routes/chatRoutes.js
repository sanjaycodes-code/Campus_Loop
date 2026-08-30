const express = require('express');
const router = express.Router();
const {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes are protected by JWT authentication
router.use(protect);

router.post('/conversations', getOrCreateConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

module.exports = router;
