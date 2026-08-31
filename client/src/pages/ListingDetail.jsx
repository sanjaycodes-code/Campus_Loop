import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Laptop,
  BookOpen,
  Headphones,
  MapPin,
  Calendar,
  ShieldCheck,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Clock,
  CheckCircle,
  Share2,
  Sparkles,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import useScrollZoom from '../hooks/useScrollZoom';
import ListingImage from '../components/ListingImage';

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Rental estimation state
  const [rentalDays, setRentalDays] = useState(3);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStartDate, setBookingStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [bookingEndDate, setBookingEndDate] = useState(
    new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0]
  );
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingConflictError, setBookingConflictError] = useState('');
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  // GSAP ScrollTrigger Hero Zoom on Product Image
  const {
    containerRef: imageContainerRef,
    visualRef: imageVisualRef,
  } = useScrollZoom({
    zoomScale: 1.16,
    start: 'top 80px',
    end: 'bottom top',
    scrub: 1,
  });

  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/listings/${id}`);
        if (res.data.success) {
          setListing(res.data.listing);
        }
      } catch (err) {
        console.error('Failed to load listing:', err);
        setError(err.response?.data?.message || 'Listing not found or removed.');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  // Real-time Socket.io Availability Status Listener
  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (data) => {
      if (data.listingId === id) {
        console.log(
          `%c[Socket.io] Realtime Status Changed for "${data.title}": isAvailable -> ${data.isAvailable}`,
          'color: #0284c7; font-weight: bold; background: #f0f9ff; padding: 2px 6px; border-radius: 4px;'
        );
        setListing((prev) =>
          prev ? { ...prev, isAvailable: data.isAvailable, status: data.status } : prev
        );
      }
    };

    socket.on('listing:statusChanged', handleStatusChanged);
    return () => {
      socket.off('listing:statusChanged', handleStatusChanged);
    };
  }, [socket, id]);

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    try {
      const res = await api.patch(`/listings/${id}/availability`);
      if (res.data.success) {
        setListing(res.data.listing);
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      alert(err.response?.data?.message || 'Failed to toggle availability status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Ownership verification check
  const isOwner =
    user &&
    listing &&
    (user._id === listing.owner?._id || user._id === listing.owner || user.role === 'admin');

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await api.delete(`/listings/${id}`);
      if (res.data?.success) {
        setShowDeleteModal(false);
        // Navigate cleanly to marketplace
        navigate('/marketplace', { replace: true });
      }
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(
        err.response?.data?.message || 'Failed to delete listing. You might not be the owner.'
      );
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full flex-1 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 h-96 bg-slate-200 rounded-2xl"></div>
            <div className="lg:col-span-5 space-y-4">
              <div className="h-8 bg-slate-200 rounded w-3/4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
              <div className="h-32 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-16 text-center flex-1">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Listing Not Found</h2>
          <p className="mt-2 text-sm text-slate-600">{error || 'This listing does not exist.'}</p>
          <Link
            to="/marketplace"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Marketplace</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleCreateBooking = async (e) => {
    e?.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/listings/${id}` } } });
      return;
    }
    setBookingSubmitting(true);
    setBookingConflictError('');
    try {
      const res = await api.post('/bookings', {
        listingId: id,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
      });

      if (res.data.success) {
        setBookingSuccessData({
          ...res.data.booking,
          checkoutUrl: res.data.url,
          sessionId: res.data.sessionId,
        });

        if (res.data.url) {
          setTimeout(() => {
            window.location.href = res.data.url;
          }, 500);
        }
      }
    } catch (err) {
      console.error('Booking error:', err);
      if (err.response?.status === 409) {
        setBookingConflictError(
          err.response?.data?.message ||
            'Booking Conflict: This item is already booked for the selected date range. Please choose different dates.'
        );
      } else {
        setBookingConflictError(
          err.response?.data?.message || 'Failed to complete booking request. Please try again.'
        );
      }
    } finally {
      setBookingSubmitting(false);
    }
  };

  const calculatedBookingDays = Math.max(
    1,
    Math.ceil(
      (new Date(bookingEndDate) - new Date(bookingStartDate)) / (1000 * 60 * 60 * 24)
    ) || 1
  );
  const calculatedBookingRent = (listing?.pricePerDay || 0) * calculatedBookingDays;
  const calculatedBookingTotal = calculatedBookingRent + (listing?.securityDeposit || 0);

  const images = listing?.images && listing.images.length > 0 ? listing.images : [];
  const totalRentalAmount = (listing?.pricePerDay || 0) * rentalDays;
  const grandTotal = totalRentalAmount + (listing?.securityDeposit || 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            {bookingSuccessData ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Rental Locked & Confirmed!</h3>
                <p className="text-xs text-slate-600">
                  Your reservation for <strong>"{listing.title}"</strong> has been atomically confirmed from{' '}
                  <strong>{new Date(bookingStartDate).toLocaleDateString()}</strong> to{' '}
                  <strong>{new Date(bookingEndDate).toLocaleDateString()}</strong>.
                </p>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1 text-left border border-slate-200">
                  <div className="flex justify-between font-semibold">
                    <span>Duration:</span>
                    <span>{calculatedBookingDays} Days</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-sky-600 font-bold">₹{calculatedBookingTotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Pickup Location:</span>
                    <span>{listing.location || listing.campus || 'NIT Durgapur'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      setBookingSuccessData(null);
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                  >
                    Done
                  </button>
                  <Link
                    to="/messages"
                    className="px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-xl hover:bg-sky-700 cursor-pointer"
                  >
                    Chat with Host
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateBooking} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-600" />
                    <h3 className="text-base font-bold text-slate-900">Select Rental Dates</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingStartDate}
                      onChange={(e) => setBookingStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      min={bookingStartDate || new Date().toISOString().split('T')[0]}
                      value={bookingEndDate}
                      onChange={(e) => setBookingEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>
                      Daily Rate (₹{listing.pricePerDay} × {calculatedBookingDays} days):
                    </span>
                    <span className="font-semibold text-slate-900">₹{calculatedBookingRent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Deposit (Refundable):</span>
                    <span className="font-semibold text-slate-900">₹{listing.securityDeposit || 0}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-slate-900 text-sm">
                    <span>Total Due:</span>
                    <span className="text-sky-600 font-extrabold">₹{calculatedBookingTotal}</span>
                  </div>
                </div>

                {/* Conflict Error Notice */}
                {bookingConflictError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{bookingConflictError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {bookingSubmitting ? 'Verifying & Locking...' : 'Confirm & Reserve'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete Rental Listing?</h3>
            <p className="text-sm text-slate-600 mt-2">
              Are you sure you want to remove <strong>"{listing.title}"</strong>? This will permanently delete the item from the campus marketplace.
            </p>

            {deleteError && (
              <p className="mt-3 text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Marketplace</span>
          </Link>

          <span className="text-xs text-slate-400 font-mono">
            ID: {listing._id.slice(-8)}
          </span>
        </div>

        {/* Owner Action Bar Banner (Visible ONLY to the owner) */}
        {isOwner && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">You are the Owner of this Listing</p>
                <p className="text-xs text-slate-600">
                  You have host permissions to edit pricing, availability, or delete this listing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border shadow-xs transition-all cursor-pointer ${
                  listing.isAvailable
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
                title="Click to toggle between In Stock and Rented in real-time"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTogglingStatus ? 'animate-spin' : ''}`} />
                <span>
                  {listing.isAvailable ? 'Mark as Rented / Unavailable' : 'Mark as In Stock / Available'}
                </span>
              </button>

              <Link
                to={`/listings/${listing._id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-sky-600" />
                <span>Edit Listing</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Image Gallery & Description */}
          <div className="lg:col-span-7 space-y-6">
            {/* Main Image Showcase with GSAP Scroll Zoom */}
            <div ref={imageContainerRef} className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              <ListingImage
                images={images.length > 0 ? [images[selectedImage] || images[0]] : []}
                category={listing.category}
                title={listing.title}
                aspectRatio="aspect-[4/3]"
                innerRef={imageVisualRef}
              >
                <div className="absolute top-4 left-4">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-md text-slate-800 border border-slate-200 shadow-xs">
                    {listing.category}
                  </span>
                </div>
              </ListingImage>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-xl border overflow-hidden flex-shrink-0 bg-slate-100 transition-all cursor-pointer ${
                      selectedImage === idx
                        ? 'border-sky-600 ring-2 ring-sky-500/20'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumb ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Description Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900">About this Item</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Condition</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {listing.condition?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Availability</span>
                  <span
                    className={`font-semibold ${
                      listing.isAvailable ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {listing.isAvailable ? 'Available Now' : 'Currently Rented'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Pickup Point</span>
                  <span className="font-semibold text-slate-800">
                    {listing.location || listing.campus || 'NIT Durgapur'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reserved Dates Schedule Box */}
            {listing.bookedPeriods && listing.bookedPeriods.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>Reserved / Booked Dates for this Item</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {listing.bookedPeriods.map((period, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs"
                    >
                      <span className="font-semibold text-slate-800">
                        {new Date(period.startDate).toLocaleDateString()} →{' '}
                        {new Date(period.endDate).toLocaleDateString()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                        {period.status === 'confirmed' ? 'Locked' : 'Pending Request'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-amber-700 pt-0.5">
                  💡 You can still rent this item for any other open dates outside these reserved slots.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Pricing, Rental Calculator & Host Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Main Rental Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 sticky top-24">
              <div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">
                      ₹{listing.pricePerDay}
                    </span>
                    <span className="text-sm text-slate-500 font-medium"> / day</span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      listing.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {listing.isAvailable ? '● In Stock' : '○ Unavailable'}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mt-2">{listing.title}</h1>
              </div>

              {/* Rental Duration Slider / Counter */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Rental Duration</span>
                  <span className="text-sky-600 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    {rentalDays} {rentalDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              {/* Price Calculation Breakdown */}
              <div className="space-y-2 text-xs border-t border-slate-100 pt-3 text-slate-600">
                <div className="flex justify-between">
                  <span>
                    ₹{listing.pricePerDay} × {rentalDays} days
                  </span>
                  <span className="font-semibold text-slate-900">₹{totalRentalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Refundable Security Deposit</span>
                  <span className="font-semibold text-slate-900">
                    ₹{listing.securityDeposit || 0}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Total Payable</span>
                  <span className="text-sky-600 font-extrabold">₹{grandTotal}</span>
                </div>
              </div>

              {/* CTA Buttons */}
              {isOwner ? (
                <Link
                  to={`/listings/${listing._id}/edit`}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  <span>Modify Listing Details</span>
                </Link>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={!listing.isAvailable}
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { from: { pathname: `/listings/${listing._id}` } } });
                        return;
                      }
                      setShowBookingModal(true);
                      setBookingConflictError('');
                      setBookingSuccessData(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-sky-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>{listing.isAvailable ? 'Request to Rent' : 'Item Currently Unavailable'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { from: { pathname: `/listings/${listing._id}` } } });
                        return;
                      }
                      try {
                        const ownerId = listing.owner?._id || listing.owner;
                        const res = await api.post('/chat/conversations', {
                          listingId: listing._id,
                          recipientId: ownerId,
                        });
                        if (res.data.success && res.data.conversation) {
                          navigate(`/messages?conversationId=${res.data.conversation._id}`);
                        }
                      } catch (err) {
                        console.error('Failed to initiate chat:', err);
                        alert(err.response?.data?.message || 'Failed to open chat.');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-all cursor-pointer border border-slate-200"
                  >
                    <MessageSquare className="w-4 h-4 text-sky-600" />
                    <span>Chat with Host</span>
                  </button>
                </div>
              )}

              {/* Peer Safety Guarantee */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Deposit held in escrow until return inspection</span>
              </div>
            </div>

            {/* Host Profile Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Item Listed By
              </h3>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                  {listing.owner?.name ? listing.owner.name.charAt(0).toUpperCase() : 'H'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{listing.owner?.name}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      NIT Durgapur Student
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-500 space-y-1">
                <p>
                  <strong className="text-slate-700">Email:</strong> {listing.owner?.email}
                </p>
                {listing.owner?.phone && (
                  <p>
                    <strong className="text-slate-700">Phone:</strong> {listing.owner.phone}
                  </p>
                )}
                <p>
                  <strong className="text-slate-700">Campus:</strong>{' '}
                  {listing.owner?.campus || 'NIT Durgapur'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListingDetail;
