const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Conversation must be linked to a Listing item'],
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find conversations for a user
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ listing: 1, participants: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
