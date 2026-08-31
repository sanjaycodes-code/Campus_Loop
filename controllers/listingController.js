const mongoose = require('mongoose');
const Listing = require('../models/Listing');

/**
 * @desc    Create a new listing
 * @route   POST /api/listings
 * @access  Private (Protected by JWT)
 */
const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      pricePerDay,
      securityDeposit,
      images,
      condition,
      campus,
      location,
      isAvailable,
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || pricePerDay === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, category, and price per day',
      });
    }

    // Normalize images: accept array or comma-separated string / single string
    let formattedImages = [];
    if (Array.isArray(images)) {
      formattedImages = images.filter((img) => typeof img === 'string' && img.trim().length > 0);
    } else if (typeof images === 'string' && images.trim().length > 0) {
      formattedImages = images
        .split(',')
        .map((img) => img.trim())
        .filter((img) => img.length > 0);
    }

    const singleImage = req.body.imageUrl || req.body.image;
    if (singleImage && typeof singleImage === 'string' && singleImage.trim().length > 0) {
      if (!formattedImages.includes(singleImage.trim())) {
        formattedImages.push(singleImage.trim());
      }
    }

    const listing = await Listing.create({
      title: title.trim(),
      description: description.trim(),
      category: category.toLowerCase(),
      owner: req.user._id, // Scoped to authenticated user
      pricePerDay: Number(pricePerDay),
      securityDeposit: securityDeposit ? Number(securityDeposit) : 0,
      images: formattedImages,
      condition: condition || 'good',
      campus: campus?.trim() || req.user.campus || 'NIT Durgapur',
      location: location?.trim() || '',
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      status: 'active',
    });

    const populatedListing = await Listing.findById(listing._id).populate(
      'owner',
      'name email campus phone avatar role isVerified'
    );

    return res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      listing: populatedListing,
    });
  } catch (error) {
    console.error('Create listing error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error while creating listing',
      error: error.message,
    });
  }
};

/**
 * Helper to escape regex special characters for safe partial search
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Get all listings with multi-criteria search, filtering & pagination
 * @route   GET /api/listings
 * @access  Public
 */
const getListings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const {
      category,
      condition,
      campus,
      search,
      minPrice,
      maxPrice,
      isAvailable,
      owner,
      status,
      sort,
    } = req.query;

    const query = {};

    // 1. Text Search across Title & Description (Safe partial regex)
    if (search && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      const searchRegex = new RegExp(sanitized, 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // 2. Filter by Category (device / book / gadget)
    if (category && category !== 'all' && category.trim()) {
      query.category = category.trim().toLowerCase();
    }

    // 3. Filter by Condition
    if (condition && condition !== 'all' && condition.trim()) {
      query.condition = condition.trim();
    }

    // 4. Filter by Campus
    if (campus && campus.trim()) {
      query.campus = { $regex: escapeRegex(campus.trim()), $options: 'i' };
    }

    // 5. Filter by Availability Status
    if (isAvailable !== undefined && isAvailable !== '' && isAvailable !== 'all') {
      query.isAvailable = isAvailable === 'true' || isAvailable === true;
    }

    // 6. Filter by Listing Status
    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'archived' };
    }

    // 7. Filter by Price Range (with min > max handling)
    const hasMin = minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice));
    const hasMax = maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice));

    if (hasMin || hasMax) {
      query.pricePerDay = {};
      if (hasMin) {
        query.pricePerDay.$gte = Math.max(0, Number(minPrice));
      }
      if (hasMax) {
        query.pricePerDay.$lte = Math.max(0, Number(maxPrice));
      }
    }

    // 8. Filter by Owner (for host profile queries)
    if (owner && mongoose.Types.ObjectId.isValid(owner)) {
      query.owner = owner;
    }

    // 9. Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (sort === 'price_asc') {
      sortOption = { pricePerDay: 1, createdAt: -1 };
    } else if (sort === 'price_desc') {
      sortOption = { pricePerDay: -1, createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    // Execute total count and paginated query concurrently in parallel
    const [total, listings] = await Promise.all([
      Listing.countDocuments(query),
      Listing.find(query)
        .select('-bookedPeriods')
        .populate('owner', 'name email campus phone avatar role isVerified')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      count: listings.length,
      total,
      pages,
      currentPage: page,
      hasMore: page < pages,
      filtersApplied: {
        search: search || null,
        category: category || 'all',
        minPrice: hasMin ? Number(minPrice) : null,
        maxPrice: hasMax ? Number(maxPrice) : null,
        isAvailable: isAvailable !== undefined ? isAvailable : null,
        sort: sort || 'createdAt:desc',
      },
      listings,
    });
  } catch (error) {
    console.error('Get listings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching listings',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single listing by ID
 * @route   GET /api/listings/:id
 * @access  Public
 */
const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format',
      });
    }

    const listing = await Listing.findById(id).populate(
      'owner',
      'name email campus phone avatar role isVerified'
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    return res.status(200).json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error('Get listing by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching listing',
      error: error.message,
    });
  }
};

/**
 * @desc    Update an existing listing (Owner only)
 * @route   PUT /api/listings/:id
 * @access  Private (Protected - Enforces Ownership)
 */
const updateListing = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format',
      });
    }

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // BACKEND OWNERSHIP CHECK:
    // Only the owner (or an admin) is authorized to modify this listing
    const isOwner = listing.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to edit this listing because you are not the owner.',
      });
    }

    // Allowed updatable fields
    const {
      title,
      description,
      category,
      pricePerDay,
      securityDeposit,
      images,
      condition,
      campus,
      location,
      isAvailable,
      status,
    } = req.body;

    if (title !== undefined) listing.title = title.trim();
    if (description !== undefined) listing.description = description.trim();
    if (category !== undefined) listing.category = category.toLowerCase();
    if (pricePerDay !== undefined) listing.pricePerDay = Number(pricePerDay);
    if (securityDeposit !== undefined) listing.securityDeposit = Number(securityDeposit);
    if (condition !== undefined) listing.condition = condition;
    if (campus !== undefined) listing.campus = campus.trim();
    if (location !== undefined) listing.location = location.trim();
    if (isAvailable !== undefined) listing.isAvailable = Boolean(isAvailable);
    if (status !== undefined) listing.status = status;

    if (images !== undefined) {
      if (Array.isArray(images)) {
        listing.images = images.filter((img) => typeof img === 'string' && img.trim().length > 0);
      } else if (typeof images === 'string') {
        listing.images = images
          .split(',')
          .map((img) => img.trim())
          .filter((img) => img.length > 0);
      }
    } else if (req.body.imageUrl || req.body.image) {
      const singleImage = req.body.imageUrl || req.body.image;
      if (typeof singleImage === 'string' && singleImage.trim().length > 0) {
        listing.images = [singleImage.trim()];
      }
    }

    const updatedListing = await listing.save();
    const populatedListing = await Listing.findById(updatedListing._id).populate(
      'owner',
      'name email campus phone avatar role isVerified'
    );

    // Broadcast real-time availability / status change event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('listing:statusChanged', {
        listingId: populatedListing._id.toString(),
        isAvailable: populatedListing.isAvailable,
        status: populatedListing.status,
        title: populatedListing.title,
        pricePerDay: populatedListing.pricePerDay,
        updatedAt: populatedListing.updatedAt,
      });
      console.log(
        `\x1b[36m[Socket.io] Emitted 'listing:statusChanged' for "${populatedListing.title}" -> isAvailable: ${populatedListing.isAvailable}\x1b[0m`
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Listing updated successfully',
      listing: populatedListing,
    });
  } catch (error) {
    console.error('Update listing error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error while updating listing',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a listing (Owner only)
 * @route   DELETE /api/listings/:id
 * @access  Private (Protected - Enforces Ownership)
 */
const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format',
      });
    }

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // BACKEND OWNERSHIP CHECK:
    // Only the owner (or an admin) is authorized to delete this listing
    const isOwner = listing.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this listing because you are not the owner.',
      });
    }

    // DEMO MODE GUARD: Protect core sample listings from permanent deletion by guest reviewers
    const protectedTitles = [
      'Texas Instruments TI-84 Plus CE Graphing Calculator',
      'Introduction to Algorithms (CLRS 4th Edition)',
      'Sony WH-1000XM4 Active Noise-Cancelling Headphones',
    ];

    if (
      (req.user.isGuest || req.user.email === 'guest@nitdgp.ac.in') &&
      protectedTitles.includes(listing.title)
    ) {
      return res.status(200).json({
        success: true,
        message:
          'Action simulated: Core sample listings are preserved in Demo Mode for upcoming reviewers.',
        isSimulated: true,
        deletedId: id,
      });
    }

    await Listing.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Listing deleted successfully',
      deletedId: id,
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting listing',
      error: error.message,
    });
  }
};

/**
 * @desc    Quick toggle availability status (In Stock <-> Rented)
 * @route   PATCH /api/listings/:id/availability or /api/listings/:id/status
 * @access  Private (Owner or Admin)
 */
const toggleListingAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing ID format',
      });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Ownership check
    const isOwner = listing.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the owner can change availability status.',
      });
    }

    // If explicit value provided in body, use it; otherwise flip
    if (req.body && req.body.isAvailable !== undefined) {
      listing.isAvailable = Boolean(req.body.isAvailable);
    } else {
      listing.isAvailable = !listing.isAvailable;
    }

    const updatedListing = await listing.save();
    const populatedListing = await Listing.findById(updatedListing._id).populate(
      'owner',
      'name email campus phone avatar role isVerified'
    );

    // Broadcast real-time Socket.io event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('listing:statusChanged', {
        listingId: populatedListing._id.toString(),
        isAvailable: populatedListing.isAvailable,
        status: populatedListing.status,
        title: populatedListing.title,
        pricePerDay: populatedListing.pricePerDay,
        updatedAt: populatedListing.updatedAt,
      });
      console.log(
        `\x1b[35m[Socket.io] Realtime broadcast -> listing:statusChanged: "${populatedListing.title}" is now ${populatedListing.isAvailable ? 'IN STOCK' : 'RENTED'}\x1b[0m`
      );
    }

    return res.status(200).json({
      success: true,
      message: `Listing is now marked as ${populatedListing.isAvailable ? 'Available (In Stock)' : 'Rented / Unavailable'}`,
      listing: populatedListing,
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error toggling availability',
      error: error.message,
    });
  }
};

module.exports = {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  toggleListingAvailability,
};
