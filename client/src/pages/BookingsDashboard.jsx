import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  RotateCcw,
  Tag,
  DollarSign,
  User,
  ShoppingBag,
  ExternalLink,
  Laptop,
  BookOpen,
  Headphones,
  CreditCard,
  Sparkles,
} from 'lucide-react';

const BookingsDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 'renter' (My Bookings) vs 'host' (Bookings on My Items)
  const [activeTab, setActiveTab] = useState(
    () => (searchParams.get('tab') === 'host' ? 'host' : 'renter')
  );

  const [renterBookings, setRenterBookings] = useState([]);
  const [hostBookings, setHostBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null);

  // Cancel Modal State
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // 1. Fetch Bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const [resRenter, resHost] = await Promise.all([
        api.get('/bookings?role=renter'),
        api.get('/bookings?role=host'),
      ]);

      if (resRenter.data.success) setRenterBookings(resRenter.data.bookings);
      if (resHost.data.success) setHostBookings(resHost.data.bookings);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Handle Return from Stripe Checkout
  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    const bookingId = searchParams.get('booking_id');

    if (status === 'success' && (sessionId || bookingId)) {
      // 1. Show honest in-progress verification notice (do NOT claim confirmed yet!)
      setPaymentNotice({
        status: 'verifying',
        sessionId: sessionId || 'Stripe Session',
        bookingId,
        message: 'Payment received! Verifying transaction with Stripe and locking rental dates...',
      });

      // 2. Call backend verification endpoint
      const verifyAndConfirm = async () => {
        try {
          const res = await api.post('/bookings/verify-session', {
            sessionId,
            bookingId,
          });

          if (res.data?.success && res.data?.confirmed) {
            // Updated to confirmed!
            const updatedBooking = res.data.booking;
            setPaymentNotice({
              status: 'confirmed',
              sessionId: updatedBooking?.stripe?.checkoutSessionId || sessionId,
              bookingId: updatedBooking?._id || bookingId,
              message: 'Payment confirmed! Your rental dates are locked and confirmed.',
            });

            // Update local state immediately so button disappears and card changes instantly
            if (updatedBooking?._id) {
              setRenterBookings((prev) =>
                prev.map((b) =>
                  b._id === updatedBooking._id
                    ? {
                        ...b,
                        ...updatedBooking,
                        status: 'confirmed',
                        stripe: {
                          ...b.stripe,
                          ...updatedBooking.stripe,
                          paymentStatus: 'paid',
                        },
                      }
                    : b
                )
              );
            }
          } else {
            // Still waiting for payment or async processing
            setPaymentNotice({
              status: 'pending',
              sessionId,
              bookingId,
              message:
                res.data?.message ||
                'Payment received. Waiting for final confirmation from payment provider...',
            });
          }
        } catch (err) {
          console.error('Payment verification error:', err);
          setPaymentNotice({
            status: 'pending',
            sessionId,
            bookingId,
            message: 'Payment received. Verifying with payment provider...',
          });
        } finally {
          fetchBookings();
        }
      };

      verifyAndConfirm();

      // Clear search params after a brief window so refresh doesn't re-trigger
      const timer = setTimeout(() => {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('status');
            next.delete('session_id');
            next.delete('booking_id');
            return next;
          },
          { replace: true }
        );
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams, fetchBookings]);

  // 2. Real-time Socket.io Listeners for booking updates
  useEffect(() => {
    if (!socket) return;

    const handleBookingCreated = () => {
      fetchBookings();
    };

    const handleBookingConfirmed = (data) => {
      console.log('[Socket.io] Booking confirmed:', data);
      setPaymentNotice({
        status: 'confirmed',
        sessionId: data.booking?.stripe?.checkoutSessionId || 'Stripe Verified',
        message: data.message || 'Payment confirmed and dates locked!',
      });
      // Update local state immediately
      if (data.booking?._id) {
        setRenterBookings((prev) =>
          prev.map((b) =>
            b._id === data.booking._id
              ? {
                  ...b,
                  ...data.booking,
                  status: 'confirmed',
                  stripe: { ...b.stripe, ...data.booking.stripe, paymentStatus: 'paid' },
                }
              : b
          )
        );
        setHostBookings((prev) =>
          prev.map((b) =>
            b._id === data.booking._id
              ? {
                  ...b,
                  ...data.booking,
                  status: 'confirmed',
                  stripe: { ...b.stripe, ...data.booking.stripe, paymentStatus: 'paid' },
                }
              : b
          )
        );
      }
      fetchBookings();
    };

    socket.on('booking:created', handleBookingCreated);
    socket.on('booking:confirmed', handleBookingConfirmed);
    socket.on('notification:new_booking', handleBookingCreated);
    socket.on('notification:booking_paid', handleBookingConfirmed);

    return () => {
      socket.off('booking:created', handleBookingCreated);
      socket.off('booking:confirmed', handleBookingConfirmed);
      socket.off('notification:new_booking', handleBookingCreated);
      socket.off('notification:booking_paid', handleBookingConfirmed);
    };
  }, [socket, fetchBookings]);

  // 3. Confirm Booking (Host Action)
  const handleConfirm = async (bookingId) => {
    setActionLoadingId(bookingId);
    try {
      const res = await api.patch(`/bookings/${bookingId}/confirm`);
      if (res.data.success) {
        setHostBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: 'confirmed' } : b))
        );
      }
    } catch (err) {
      console.error('Confirm error:', err);
      alert(err.response?.data?.message || 'Failed to confirm booking.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Cancel Booking (Host or Renter Action)
  const handleCancelSubmit = async (e) => {
    e?.preventDefault();
    if (!cancelModalBooking) return;

    setActionLoadingId(cancelModalBooking._id);
    try {
      const res = await api.patch(`/bookings/${cancelModalBooking._id}/cancel`, {
        reason: cancelReason || 'Cancelled by user',
      });

      if (res.data.success) {
        // Update local state
        setRenterBookings((prev) =>
          prev.map((b) => (b._id === cancelModalBooking._id ? { ...b, status: 'cancelled' } : b))
        );
        setHostBookings((prev) =>
          prev.map((b) => (b._id === cancelModalBooking._id ? { ...b, status: 'cancelled' } : b))
        );
        setCancelModalBooking(null);
        setCancelReason('');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Open Direct Chat with Partner
  const handleChat = async (listingId, recipientId) => {
    try {
      const res = await api.post('/chat/conversations', { listingId, recipientId });
      if (res.data.success && res.data.conversation) {
        navigate(`/messages?conversationId=${res.data.conversation._id}`);
      }
    } catch (err) {
      console.error('Chat error:', err);
      navigate('/messages');
    }
  };

  // 6. Pay with Stripe (Renter Action)
  const handleCheckout = async (bookingId) => {
    setActionLoadingId(bookingId);
    try {
      const res = await api.post(`/bookings/${bookingId}/checkout`);
      if (res.data.success && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err.response?.data?.message || 'Failed to start Stripe checkout');
    } finally {
      setActionLoadingId(null);
    }
  };

  const currentBookings = activeTab === 'renter' ? renterBookings : hostBookings;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2B1D0C]/95 text-[#FBBF24] border border-[#D97706]/60 text-xs font-bold shadow-[0_2px_10px_rgba(217,119,6,0.2)]">
            <Clock className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>Pending Host Approval</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D2418]/95 text-[#34D399] border border-[#059669]/60 text-xs font-bold shadow-[0_2px_10px_rgba(5,150,105,0.2)]">
            <CheckCircle className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Confirmed & Locked</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F1D33]/95 text-[#38BDF8] border border-[#0284C7]/60 text-xs font-bold shadow-[0_2px_10px_rgba(2,132,199,0.2)]">
            <CheckCircle className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2B1118]/95 text-[#FB7185] border border-[#E11D48]/60 text-xs font-bold shadow-[0_2px_10px_rgba(225,29,72,0.2)]">
            <XCircle className="w-3.5 h-3.5 text-[#FB7185]" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] flex flex-col font-sans text-slate-200">
      <Navbar />

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#141622] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#26293D] animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-[#2B1118] text-[#FB7185] flex items-center justify-center mb-4 border border-[#E11D48]/50">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-clash font-bold text-white">Cancel Rental Booking?</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to cancel the booking for{' '}
              <strong className="text-white">"{cancelModalBooking.listing?.title}"</strong>? This will release the reserved date slot and make it available for other students.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for cancellation (Optional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule change, exam postponed..."
                className="w-full px-3 py-2.5 bg-[#0D0E15] border border-[#26293D] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] transition-colors"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1F2233] rounded-xl transition-colors cursor-pointer border border-[#26293D]"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={actionLoadingId === cancelModalBooking._id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-[0_0_16px_rgba(225,29,72,0.35)] transition-all disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
              >
                {actionLoadingId === cancelModalBooking._id ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1F2233]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-clash font-extrabold text-white tracking-tight">
              Rentals & <span className="text-[#A78BFA]">Bookings</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Track your active rentals, incoming borrower requests, and locked dates.
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex items-center gap-2 p-1.5 bg-[#141622] rounded-2xl border border-[#26293D] self-start sm:self-auto shadow-inner">
            <button
              onClick={() => setActiveTab('renter')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'renter'
                  ? 'bg-[#8B5CF6] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Bookings ({renterBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('host')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'host'
                  ? 'bg-[#8B5CF6] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bookings on My Items ({hostBookings.length})
            </button>
          </div>
        </div>

        {/* Payment Notice Banner (Honest state: Verifying vs Confirmed vs Pending) */}
        {paymentNotice && (
          <div
            className={`mt-6 p-4.5 rounded-2xl border flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2 ${
              paymentNotice.status === 'confirmed'
                ? 'bg-[#0D2418]/90 border-[#059669]/60 text-emerald-200 shadow-[0_0_24px_rgba(5,150,105,0.2)]'
                : 'bg-[#2B1D0C]/90 border-[#D97706]/60 text-amber-200 shadow-[0_0_24px_rgba(217,119,6,0.2)]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md ${
                  paymentNotice.status === 'confirmed'
                    ? 'bg-emerald-500 shadow-emerald-500/20'
                    : 'bg-amber-500 shadow-amber-500/20'
                }`}
              >
                {paymentNotice.status === 'confirmed' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>
                    {paymentNotice.status === 'confirmed'
                      ? '🎉 Payment Successful & Booking Confirmed!'
                      : '⏳ Payment Received — Confirming Reservation...'}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold border ${
                      paymentNotice.status === 'confirmed'
                        ? 'bg-[#059669]/60 text-emerald-200 border-emerald-400/40'
                        : 'bg-[#D97706]/60 text-amber-200 border-amber-400/40 animate-pulse'
                    }`}
                  >
                    {paymentNotice.status === 'confirmed' ? 'Dates Locked' : 'Verifying'}
                  </span>
                </h4>
                <p
                  className={`text-xs mt-0.5 ${
                    paymentNotice.status === 'confirmed' ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {paymentNotice.message}
                  {paymentNotice.sessionId && (
                    <span
                      className={`ml-1.5 font-mono text-[11px] px-1.5 py-0.5 rounded border ${
                        paymentNotice.status === 'confirmed'
                          ? 'bg-[#102A1E] text-emerald-300 border-emerald-500/30'
                          : 'bg-[#1D1409] text-amber-300 border-amber-500/30'
                      }`}
                    >
                      ID: {paymentNotice.sessionId.slice(-10)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPaymentNotice(null)}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Bookings Feed */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-[#141622] rounded-2xl border border-[#26293D] p-6"></div>
              ))}
            </div>
          ) : currentBookings.length === 0 ? (
            <div className="bg-[#141622] rounded-2xl border border-[#26293D] p-12 text-center shadow-2xl max-w-md mx-auto my-8">
              <div className="w-14 h-14 rounded-2xl bg-[#181A26] text-[#A78BFA] flex items-center justify-center mx-auto mb-3 border border-[#2D3147]">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">
                {activeTab === 'renter' ? 'No Rental Bookings Yet' : 'No Incoming Bookings Yet'}
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {activeTab === 'renter'
                  ? 'Explore the campus marketplace to find calculators, textbooks, lab equipment, and tech gear for rent.'
                  : 'When fellow students request to rent items from your listings, their requests will appear here.'}
              </p>
              <div className="mt-5">
                <Link
                  to={activeTab === 'renter' ? '/marketplace' : '/listings/new'}
                  className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.35)] inline-block transition-all btn-press-snap"
                >
                  {activeTab === 'renter' ? 'Browse Marketplace' : 'List an Item'}
                </Link>
              </div>
            </div>
          ) : (
            currentBookings.map((booking) => {
              const partner = activeTab === 'renter' ? booking.owner : booking.renter;
              const primaryImage =
                booking.listing?.images && booking.listing.images.length > 0
                  ? booking.listing.images[0]
                  : null;

              return (
                <div
                  key={booking._id}
                  className="bg-[#141622] rounded-2xl border border-[#26293D] p-5 sm:p-6 shadow-xl hover:border-[#8B5CF6]/40 transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                  {/* Left Column: Item + Dates + Partner */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Item Thumbnail */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#0D0E15] rounded-xl overflow-hidden border border-[#26293D] flex-shrink-0 flex items-center justify-center">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={booking.listing?.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-slate-400">
                          {booking.listing?.category === 'device' && <Laptop className="w-8 h-8 text-[#38BDF8]" />}
                          {booking.listing?.category === 'book' && <BookOpen className="w-8 h-8 text-[#FBBF24]" />}
                          {booking.listing?.category === 'gadget' && (
                            <Headphones className="w-8 h-8 text-[#C084FC]" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Information */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(booking.status)}
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          ID: {booking._id.slice(-6)}
                        </span>
                      </div>

                      <Link
                        to={`/listings/${booking.listing?._id}`}
                        className="font-bold text-white text-sm sm:text-base hover:text-[#A78BFA] transition-colors block truncate"
                      >
                        {booking.listing?.title || 'Listing item'}
                      </Link>

                      {/* Dates Row */}
                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#A78BFA]" />
                          <span>
                            <strong className="text-white">{new Date(booking.startDate).toLocaleDateString()}</strong> →{' '}
                            <strong className="text-white">{new Date(booking.endDate).toLocaleDateString()}</strong> (
                            {booking.totalDays} Days)
                          </span>
                        </div>
                      </div>

                      {/* Partner Contact Row */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                        <span className="font-semibold text-slate-300">
                          {activeTab === 'renter' ? 'Host:' : 'Renter:'}
                        </span>
                        <span className="text-white">{partner?.name || 'Student'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-slate-400">{partner?.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Financial Breakdown */}
                  <div className="p-3.5 bg-[#0D0E15] rounded-xl border border-[#26293D] text-xs space-y-1 min-w-[180px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Daily Rate:</span>
                      <span className="font-semibold text-slate-200">
                        ₹{booking.pricePerDay}/day
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Security Deposit:</span>
                      <span className="font-semibold text-slate-200">
                        ₹{booking.securityDeposit}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-[#1F2233] font-bold text-slate-200">
                      <span>Total Amount:</span>
                      <span className="text-[#A78BFA] font-black text-sm">₹{booking.totalAmount + booking.securityDeposit}</span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap lg:flex-col items-stretch justify-end gap-2 min-w-[150px]">
                    {/* Chat with Partner */}
                    <button
                      type="button"
                      onClick={() => handleChat(booking.listing?._id, partner?._id)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#181A26] hover:bg-[#1F2233] text-slate-200 text-xs font-semibold rounded-xl border border-[#26293D] transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#A78BFA]" />
                      <span>Chat</span>
                    </button>

                    {/* Host Actions for Pending Bookings */}
                    {activeTab === 'host' && booking.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleConfirm(booking._id)}
                        disabled={actionLoadingId === booking._id}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-[0_0_16px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Accept Booking</span>
                      </button>
                    )}

                    {/* Renter Actions for Pending Bookings: Pay with Stripe */}
                    {activeTab === 'renter' && booking.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleCheckout(booking._id)}
                        disabled={actionLoadingId === booking._id}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-[0_0_16px_rgba(139,92,246,0.35)] transition-all cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay with Stripe</span>
                      </button>
                    )}

                    {/* Cancel Action (Available to both for pending/confirmed bookings) */}
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <button
                        type="button"
                        onClick={() => setCancelModalBooking(booking)}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#2B1118]/80 hover:bg-[#3D1823] text-rose-300 text-xs font-semibold rounded-xl border border-[#E11D48]/50 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{activeTab === 'host' ? 'Decline / Cancel' : 'Cancel'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingsDashboard;
