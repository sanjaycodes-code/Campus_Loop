const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect private routes using JWT Bearer authentication
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from 'Bearer <token>'
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from DB (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user no longer exists',
        });
      }

      return next();
    } catch (error) {
      console.error('Auth protect error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token verification failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no bearer token provided',
    });
  }
};

module.exports = { protect };
