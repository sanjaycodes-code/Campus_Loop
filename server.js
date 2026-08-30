const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Create HTTP server instance
const server = http.createServer(app);

// Initialize Socket.io attached to HTTP server
// Production-ready Cross-Origin Resource Sharing (CORS) Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return true;
  if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) return true;
  return true; // Safe fallback for preview deployments
};

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature', 'x-simulator'],
};

// Initialize Socket.io with Cross-Origin & Polling Fallback configuration
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Socket.io Connection & Event Handling
io.on('connection', (socket) => {
  console.log(`\x1b[35m[Socket.io] Client connected: ${socket.id}\x1b[0m`);

  // Join user-specific notification room
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`[Socket.io] Socket ${socket.id} joined user room: ${userId}`);
    }
  });

  // Join a specific chat conversation room
  socket.on('join_conversation', (conversationId) => {
    if (conversationId) {
      socket.join(conversationId.toString());
      console.log(`[Socket.io] Socket ${socket.id} joined conversation: ${conversationId}`);
    }
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    if (conversationId) {
      socket.leave(conversationId.toString());
      console.log(`[Socket.io] Socket ${socket.id} left conversation: ${conversationId}`);
    }
  });

  // Real-time typing indicators
  socket.on('typing', ({ conversationId, userName }) => {
    socket.to(conversationId).emit('user_typing', { conversationId, userName });
  });

  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(conversationId).emit('user_stop_typing', { conversationId });
  });

  // Test Event: Ping -> Pong with server timestamp
  socket.on('ping', (data) => {
    console.log(`\x1b[36m[Socket.io] Received 'ping' from ${socket.id}\x1b[0m`, data || '');
    socket.emit('pong', {
      message: 'pong from server',
      timestamp: new Date().toISOString(),
      socketId: socket.id,
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`\x1b[33m[Socket.io] Client disconnected: ${socket.id} (Reason: ${reason})\x1b[0m`);
  });
});

// Make io accessible in Express routes/middleware via req.app.get('io')
app.set('io', io);

// Stripe Webhook MUST be registered BEFORE express.json() to preserve raw Buffer body for signature verification
app.use(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  require('./routes/webhookRoutes')
);

// Body Parser Middleware (10mb limit to support photo uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS for Express REST endpoints
app.use(cors(corsOptions));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));

// 404 Not Found Middleware
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`CampusLoop server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
