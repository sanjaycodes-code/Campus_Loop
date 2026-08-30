const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// NIT Durgapur email validation regex:
// e.g. ksv.24U10658@nitdgp.ac.in
const NITDGP_EMAIL_REGEX = /^[a-z]+\.\d{2}[A-Za-z]\d{4,6}@nitdgp\.ac\.in$/;

/**
 * @desc    Register a new student user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, campus, phone } = req.body;

    // 1. Basic field presence check
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const trimmedEmail = email.trim();

    // 2. Strict NIT Durgapur email format check (Pre-DB / Pre-Hashing validation)
    if (!NITDGP_EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message:
          "Registration restricted: Only official NIT Durgapur student emails matching the format '<initials>.<year><section><roll>@nitdgp.ac.in' (e.g. ksv.24U10658@nitdgp.ac.in) are permitted.",
      });
    }

    // 3. Password length check
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // 4. Check if user already exists
    const normalizedEmail = trimmedEmail.toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user is already registered with this institute email',
      });
    }

    // 5. Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Create user in database
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      campus: campus?.trim() || 'NIT Durgapur',
      phone: phone?.trim() || '',
      role: 'student',
      isVerified: true, // Institute email verified by format
    });

    // 7. Issue JWT token and return user profile
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        campus: user.campus,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate request payload
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Query user by email (explicitly select password because select: false is set in schema)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4. Generate JWT token
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        campus: user.campus,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by JWT)
 */
const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user profile',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
