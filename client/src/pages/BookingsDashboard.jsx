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
  const [activeTab, setActiveTab] = useState('renter');

  const [renterBookings, setRenterBookings] = useState([]);
  const [hostBookings, setHostBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(null);

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

    if (status === 'success') {
      setPaymentSuccessNotice({
        sessionId: sessionId || 'cs_test_session',
        bookingId,
        message: 'Payment received! Your rental booking is locked and confirmed.',
      });

      // Trigger instant webhook simulation if using test flow
      const triggerConfirmation = async () => {
        try {
          if (sessionId || bookingId) {
            await api.post('/webhooks/stripe', {
              type: 'checkout.session.completed',
              data: {
                object: {
                  id: sessionId,
                  client_reference_id: bookingId,
                  payment_intent: `pi_test_${Date.now()}`,
                  metadata: { bookingId },
                },
              },
            });
          }
        } catch (e) {
          // Handled or signature enforced
        } finally {
          fetchBookings();
        }
      };

      triggerConfirmation();

      setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 3000);
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
      setPaymentSuccessNotice({
        sessionId: data.booking?.stripe?.checkoutSessionId || 'Stripe Webhook Verified',
        message: data.message || 'Payment confirmed and dates locked!',
      });
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Host Approval</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Confirmed & Locked</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cancel Rental Booking?</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to cancel the booking for{' '}
              <strong>"{cancelModalBooking.listing?.title}"</strong>? This will release the reserved date slot and make it available for other students.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for cancellation (Optional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule change, exam postponed..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={actionLoadingId === cancelModalBooking._id}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Rentals & Bookings Dashboard
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Track your active rentals, incoming borrower requests, and dates.
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl self-start sm:self-auto shadow-inner">
            <button
              onClick={() => setActiveTab('renter')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'renter'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Bookings ({renterBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('host')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'host'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bookings on My Items ({hostBookings.length})
            </button>
          </div>
        </div>

        {/* Payment Success & Confirmation Banner */}
        {paymentSuccessNotice && (
          <div className="mt-6 p-4.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                  <span>🎉 Payment Successful & Booking Confirmed!</span>
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                    Dates Locked
                  </span>
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {paymentSuccessNotice.message ||
                    'Your Stripe payment was confirmed. The item is reserved for your dates.'}
                  {paymentSuccessNotice.sessionId && (
                    <span className="ml-1.5 font-mono text-[11px] bg-emerald-100/80 px-1.5 py-0.5 rounded text-emerald-900">
                      ID: {paymentSuccessNotice.sessionId.slice(-10)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPaymentSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 p-2 rounded-xl hover:bg-emerald-100/60 transition-colors cursor-pointer"
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
                <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 p-6"></div>
              ))}
            </div>
          ) : currentBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs max-w-md mx-auto my-8">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3 border border-sky-100">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {activeTab === 'renter' ? 'No Rental Bookings Yet' : 'No Incoming Bookings Yet'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {activeTab === 'renter'
                  ? 'Explore the campus marketplace to find calculators, textbooks, lab equipment, and tech gear for rent.'
                  : 'When fellow students request to rent items from your listings, their requests will appear here.'}
              </p>
              <div className="mt-5">
                <Link
                  to={activeTab === 'renter' ? '/marketplace' : '/listings/new'}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs inline-block"
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
                  className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                  {/* Left Column: Item + Dates + Partner */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Item Thumbnail */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={booking.listing?.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-slate-400">
                          {booking.listing?.category === 'device' && <Laptop className="w-8 h-8" />}
                          {booking.listing?.category === 'book' && <BookOpen className="w-8 h-8" />}
                          {booking.listing?.category === 'gadget' && (
                            <Headphones className="w-8 h-8" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Information */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(booking.status)}
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          ID: {booking._id.slice(-6)}
                        </span>
                      </div>

                      <Link
                        to={`/listings/${booking.listing?._id}`}
                        className="font-bold text-slate-900 text-sm sm:text-base hover:text-sky-600 transition-colors block truncate"
                      >
                        {booking.listing?.title || 'Listing item'}
                      </Link>

                      {/* Dates Row */}
                      <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span>
                            <strong>{new Date(booking.startDate).toLocaleDateString()}</strong> →{' '}
                            <strong>{new Date(booking.endDate).toLocaleDateString()}</strong> (
                            {booking.totalDays} Days)
                          </span>
                        </div>
                      </div>

                      {/* Partner Contact Row */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                        <span className="font-semibold text-slate-700">
                          {activeTab === 'renter' ? 'Host:' : 'Renter:'}
                        </span>
                        <span>{partner?.name || 'Student'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px]">{partner?.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Financial Breakdown */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 min-w-[170px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Daily Rate:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{booking.pricePerDay}/day
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Security Deposit:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{booking.securityDeposit}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                      <span>Total Amount:</span>
                      <span className="text-sky-600 font-extrabold">₹{booking.totalAmount + booking.securityDeposit}</span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap lg:flex-col items-stretch justify-end gap-2 min-w-[150px]">
                    {/* Chat with Partner */}
                    <button
                      type="button"
                      onClick={() => handleChat(booking.listing?._id, partner?._id)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                      <span>Chat</span>
                    </button>

                    {/* Host Actions for Pending Bookings */}
                    {activeTab === 'host' && booking.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleConfirm(booking._id)}
                        disabled={actionLoadingId === booking._id}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
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
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
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
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl border border-rose-200 transition-colors cursor-pointer"
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
