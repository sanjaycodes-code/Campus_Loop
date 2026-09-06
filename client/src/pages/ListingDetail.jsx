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

  const getCategoryBadgeColor = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'device':
        return 'bg-[#0F172A]/95 text-[#38BDF8] border-[#0284C7]/60 shadow-[0_2px_10px_rgba(2,132,199,0.2)]';
      case 'book':
        return 'bg-[#261B0E]/95 text-[#FBBF24] border-[#D97706]/60 shadow-[0_2px_10px_rgba(217,119,6,0.2)]';
      case 'gadget':
        return 'bg-[#26103D]/95 text-[#C084FC] border-[#A855F7]/60 shadow-[0_2px_10px_rgba(168,85,247,0.2)]';
      default:
        return 'bg-[#181A26]/95 text-[#C4B5FD] border-[#8B5CF6]/40 shadow-xs';
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] text-slate-200 flex flex-col font-sans selection:bg-[#8B5CF6]/30 selection:text-white">
      <Navbar />

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141622] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#26293D] animate-in fade-in zoom-in duration-150 text-slate-200">
            {bookingSuccessData ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0D2418] text-[#34D399] flex items-center justify-center mx-auto border border-[#059669]/50">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white">Rental Locked & Confirmed!</h3>
                <p className="text-xs text-slate-400">
                  Your reservation for <strong className="text-white">"{listing.title}"</strong> has been atomically confirmed from{' '}
                  <strong className="text-white">{new Date(bookingStartDate).toLocaleDateString()}</strong> to{' '}
                  <strong className="text-white">{new Date(bookingEndDate).toLocaleDateString()}</strong>.
                </p>

                <div className="p-3 bg-[#0D0E15] rounded-xl text-xs text-slate-300 space-y-1 text-left border border-[#26293D]">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-white">{calculatedBookingDays} Days</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-400">Total Amount:</span>
                    <span className="text-[#A78BFA] font-bold">₹{calculatedBookingTotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Pickup Location:</span>
                    <span className="text-slate-400">{listing.location || listing.campus || 'NIT Durgapur'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      setBookingSuccessData(null);
                    }}
                    className="px-4 py-2 bg-[#181A26] hover:bg-[#1F2233] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-[#26293D] cursor-pointer"
                  >
                    Done
                  </button>
                  <Link
                    to="/messages"
                    className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-xl shadow-[0_0_16px_rgba(139,92,246,0.35)] cursor-pointer"
                  >
                    Chat with Host
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateBooking} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#26293D]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#A78BFA]" />
                    <h3 className="text-base font-bold text-white">Select Rental Dates</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingStartDate}
                      onChange={(e) => setBookingStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0D0E15] border border-[#26293D] rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      min={bookingStartDate || new Date().toISOString().split('T')[0]}
                      value={bookingEndDate}
                      onChange={(e) => setBookingEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0D0E15] border border-[#26293D] rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]"
                    />
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-3.5 bg-[#0D0E15] rounded-xl border border-[#26293D] space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>
                      Daily Rate (₹{listing.pricePerDay} × {calculatedBookingDays} days):
                    </span>
                    <span className="font-semibold text-white">₹{calculatedBookingRent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Deposit (Refundable):</span>
                    <span className="font-semibold text-white">₹{listing.securityDeposit || 0}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#26293D] font-bold text-white text-sm">
                    <span>Total Due:</span>
                    <span className="text-[#A78BFA] font-black">₹{calculatedBookingTotal}</span>
                  </div>
                </div>

                {/* Conflict Error Notice */}
                {bookingConflictError && (
                  <div className="p-3 bg-[#24141E] border border-[#441D29] rounded-xl text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{bookingConflictError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-xl shadow-[0_0_16px_rgba(139,92,246,0.35)] transition-all disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141622] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#26293D] animate-in fade-in zoom-in duration-150 text-slate-200">
            <div className="w-12 h-12 rounded-xl bg-[#24141E] text-rose-400 flex items-center justify-center mb-4 border border-[#441D29]">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Delete Rental Listing?</h3>
            <p className="text-sm text-slate-400 mt-2">
              Are you sure you want to remove <strong className="text-white">"{listing.title}"</strong>? This will permanently delete the item from the campus marketplace.
            </p>

            {deleteError && (
              <p className="mt-3 text-xs text-rose-300 font-semibold bg-[#24141E] p-2.5 rounded-lg border border-[#441D29]">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A78BFA] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Marketplace</span>
          </Link>

          <span className="text-xs text-slate-500 font-mono">
            ID: {listing._id.slice(-8)}
          </span>
        </div>

        {/* Owner Action Bar Banner (Visible ONLY to the owner) */}
        {isOwner && (
          <div className="mb-6 p-4 rounded-2xl bg-[#141622] border border-[#26293D] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#181A26] border border-[#2D3147] text-[#C4B5FD] flex items-center justify-center flex-shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">You are the Owner of this Listing</p>
                <p className="text-xs text-slate-400">
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
                    ? 'bg-[#2B1D0C] hover:bg-[#3D2811] text-amber-300 border-[#D97706]/50'
                    : 'bg-[#0D2418] hover:bg-[#133322] text-[#34D399] border-[#059669]/50'
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#181A26] hover:bg-[#1F2233] text-slate-200 text-xs font-semibold rounded-xl border border-[#26293D] shadow-xs transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span>Edit Listing</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#24141E] hover:bg-[#331826] text-rose-400 text-xs font-semibold rounded-xl border border-[#441D29] transition-colors cursor-pointer"
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
            <div ref={imageContainerRef} className="rounded-2xl overflow-hidden border border-[#26293D] shadow-md bg-[#141622]">
              <ListingImage
                images={images.length > 0 ? [images[selectedImage] || images[0]] : []}
                category={listing.category}
                title={listing.title}
                aspectRatio="aspect-[4/3]"
                innerRef={imageVisualRef}
              >
                <div className="absolute top-4 left-4">
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border backdrop-blur-md shadow-inner ${getCategoryBadgeColor(
                      listing.category
                    )}`}
                  >
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
                    className={`w-16 h-16 rounded-xl border overflow-hidden flex-shrink-0 bg-[#141622] transition-all cursor-pointer ${
                      selectedImage === idx
                        ? 'border-[#8B5CF6] ring-2 ring-[#8B5CF6]/30'
                        : 'border-[#26293D] opacity-70 hover:opacity-100'
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
            <div className="bg-[#141622] p-6 rounded-2xl border border-[#26293D] shadow-xs space-y-4">
              <h2 className="text-base font-bold text-white">About this Item</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                {listing.description}
              </p>

              <div className="pt-4 border-t border-[#1F2233] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Condition</span>
                  <span className="font-semibold text-slate-200 capitalize">
                    {listing.condition?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Availability</span>
                  <span
                    className={`font-semibold ${
                      listing.isAvailable ? 'text-[#34D399]' : 'text-slate-400'
                    }`}
                  >
                    {listing.isAvailable ? 'Available Now' : 'Currently Rented'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Pickup Point</span>
                  <span className="font-semibold text-slate-200">
                    {listing.location || listing.campus || 'NIT Durgapur'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reserved Dates Schedule Box */}
            {listing.bookedPeriods && listing.bookedPeriods.length > 0 && (
              <div className="bg-[#1A1612] border border-[#3D3222] rounded-2xl p-5 space-y-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Reserved / Booked Dates for this Item</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {listing.bookedPeriods.map((period, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-[#141622] p-2.5 rounded-xl border border-[#3D3222] shadow-2xs"
                    >
                      <span className="font-semibold text-slate-300">
                        {new Date(period.startDate).toLocaleDateString()} →{' '}
                        {new Date(period.endDate).toLocaleDateString()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2B1D0C] text-amber-300 border border-[#D97706]/40">
                        {period.status === 'confirmed' ? 'Locked' : 'Pending Request'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-amber-400/80 pt-0.5">
                  💡 You can still rent this item for any other open dates outside these reserved slots.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Pricing, Rental Calculator & Host Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Main Rental Box */}
            <div className="bg-[#141622] p-6 rounded-2xl border border-[#26293D] shadow-md space-y-5 sticky top-24">
              <div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-black text-[#A78BFA] tracking-tight">
                      ₹{listing.pricePerDay}
                    </span>
                    <span className="text-sm text-slate-400 font-medium"> / day</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border backdrop-blur-md shadow-xs ${
                      listing.isAvailable
                        ? 'border-[#8B5CF6]/40 bg-[#181A26]/95 text-[#C4B5FD]'
                        : 'border-[#26293D] bg-[#0D0E15]/90 text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        listing.isAvailable ? 'bg-[#8B5CF6] animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    {listing.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-white mt-2 font-sans">{listing.title}</h1>
              </div>

              {/* Rental Duration Slider / Counter */}
              <div className="p-4 rounded-xl bg-[#0D0E15] border border-[#26293D] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Rental Duration</span>
                  <span className="text-[#C4B5FD] font-bold bg-[#181A26] px-2.5 py-0.5 rounded-lg border border-[#2D3147] shadow-inner">
                    {rentalDays} {rentalDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(Number(e.target.value))}
                  className="w-full accent-[#8B5CF6] cursor-pointer"
                />
              </div>

              {/* Price Calculation Breakdown */}
              <div className="space-y-2 text-xs border-t border-[#1F2233] pt-3 text-slate-400">
                <div className="flex justify-between">
                  <span>
                    ₹{listing.pricePerDay} × {rentalDays} days
                  </span>
                  <span className="font-semibold text-white">₹{totalRentalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Refundable Security Deposit</span>
                  <span className="font-semibold text-white">
                    ₹{listing.securityDeposit || 0}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#1F2233] text-sm font-bold text-white">
                  <span>Total Payable</span>
                  <span className="text-[#A78BFA] font-black text-lg">₹{grandTotal}</span>
                </div>
              </div>

              {/* CTA Buttons */}
              {isOwner ? (
                <Link
                  to={`/listings/${listing._id}/edit`}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#181A26] hover:bg-[#1F2233] text-white text-sm font-semibold rounded-xl border border-[#26293D] transition-all cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-[#A78BFA]" />
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
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl shadow-[0_0_24px_rgba(139,92,246,0.38)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#181A26] hover:bg-[#1F2233] text-slate-200 text-sm font-semibold rounded-xl transition-all cursor-pointer border border-[#26293D]"
                  >
                    <MessageSquare className="w-4 h-4 text-[#A78BFA]" />
                    <span>Chat with Host</span>
                  </button>
                </div>
              )}

              {/* Peer Safety Guarantee */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
                <ShieldCheck className="w-4 h-4 text-[#A78BFA]" />
                <span>Deposit held in escrow until return inspection</span>
              </div>
            </div>

            {/* Host Profile Card */}
            <div className="bg-[#141622] p-5 rounded-2xl border border-[#26293D] shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Item Listed By
              </h3>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#181A26] border border-[#2D3147] text-[#C4B5FD] font-bold text-lg flex items-center justify-center shadow-inner">
                  {listing.owner?.name ? listing.owner.name.charAt(0).toUpperCase() : 'H'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{listing.owner?.name}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span className="text-[11px] text-[#C4B5FD] font-semibold">
                      NIT Durgapur Student
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-400 space-y-1">
                <p>
                  <strong className="text-slate-300">Email:</strong> {listing.owner?.email}
                </p>
                {listing.owner?.phone && (
                  <p>
                    <strong className="text-slate-300">Phone:</strong> {listing.owner.phone}
                  </p>
                )}
                <p>
                  <strong className="text-slate-300">Campus:</strong>{' '}
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
