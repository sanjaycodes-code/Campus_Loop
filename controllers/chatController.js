const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Listing = require('../models/Listing');

/**
 * @desc    Get or create a conversation between current user & host/renter for a listing
 * @route   POST /api/chat/conversations
 * @access  Private
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const { listingId, recipientId } = req.body;

    if (!listingId || !recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide listingId and recipientId',
      });
    }

    if (req.user._id.toString() === recipientId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot initiate a chat with yourself.',
      });
    }

    // Verify listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      listing: listingId,
      participants: { $all: [req.user._id, recipientId] },
    })
      .populate('participants', 'name email campus phone avatar role isVerified')
      .populate('listing', 'title pricePerDay securityDeposit category images isAvailable campus location')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name' },
      });

    if (!conversation) {
      // Create new conversation
      const newConv = await Conversation.create({
        participants: [req.user._id, recipientId],
        listing: listingId,
        lastMessageAt: new Date(),
      });

      conversation = await Conversation.findById(newConv._id)
        .populate('participants', 'name email campus phone avatar role isVerified')
        .populate('listing', 'title pricePerDay securityDeposit category images isAvailable campus location');
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Get/Create conversation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving conversation',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all active conversations for the authenticated student
 * @route   GET /api/chat/conversations
 * @access  Private
 */
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email campus phone avatar role isVerified')
      .populate('listing', 'title pricePerDay securityDeposit category images isAvailable campus location')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name' },
      })
      .sort({ lastMessageAt: -1 });

    return res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching conversations',
      error: error.message,
    });
  }
};

/**
 * @desc    Get message history for a specific conversation
 * @route   GET /api/chat/conversations/:conversationId/messages
 * @access  Private
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Verify current user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a participant in this conversation.',
      });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name email avatar role')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving messages',
      error: error.message,
    });
  }
};

/**
 * @desc    Send a message in a conversation (also broadcasts via Socket.io)
 * @route   POST /api/chat/conversations/:conversationId/messages
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot be empty',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Verify participation
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot post messages to this conversation.',
      });
    }

    // 1. Create message in DB
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text: text.trim(),
      readBy: [req.user._id],
    });

    // 2. Update Conversation lastMessage & timestamp
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name email avatar role'
    );

    // 3. Emit real-time message event via Socket.io to the room
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId).emit('receive_message', populatedMessage);
      // Also notify individual participant rooms for inbox updating
      conversation.participants.forEach((pId) => {
        io.to(pId.toString()).emit('conversation_updated', {
          conversationId,
          lastMessage: populatedMessage,
        });
      });
    }

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error sending message',
      error: error.message,
    });
  }
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
};
