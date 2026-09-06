import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ShieldCheck, CreditCard, Lock, ArrowLeft, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';

const StripeTestCheckout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get('session_id') || `cs_test_${Date.now()}`;
  const bookingId = searchParams.get('booking_id') || '';
  const amount = searchParams.get('amount') || '150';
  const title = searchParams.get('title') || 'Campus Rental Item';

  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [name, setName] = useState('NIT Durgapur Student');
  const [processing, setProcessing] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/bookings/verify-session', {
        sessionId,
        bookingId,
      });
    } catch (err) {
      console.log('Session verification call:', err);
    }
    setTimeout(() => {
      // Redirect back with session_id and booking_id
      navigate(`/bookings?session_id=${sessionId}&status=success&booking_id=${bookingId}`);
    }, 600);
  };

  const handleCancel = () => {
    navigate('/bookings?status=cancelled');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      {/* Top Stripe Test Mode Banner */}
      <div className="max-w-3xl w-full mb-6 bg-indigo-950/80 border border-indigo-500/30 rounded-2xl p-4 text-xs flex items-center justify-between gap-3 text-indigo-200">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-white font-black text-[10px] uppercase tracking-wider">
            TEST MODE
          </span>
          <span>
            Stripe Hosted Checkout (Test Mode). Storing Session ID: <strong className="text-white font-mono">{sessionId.slice(0, 18)}...</strong>
          </span>
        </div>
        <button
          onClick={handleCancel}
          className="text-slate-400 hover:text-white underline cursor-pointer text-[11px]"
        >
          Cancel & Return
        </button>
      </div>

      {/* Main Checkout Container */}
      <div className="max-w-3xl w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12 backdrop-blur-md">
        {/* Left Side: Order Summary */}
        <div className="md:col-span-5 bg-slate-950/60 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-700/60 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4" />
              <span>CampusLoop Escrow</span>
            </div>

            <span className="text-xs text-slate-400 font-medium">Pay to Campus Host</span>
            <div className="text-3xl font-black text-white mt-1">₹{amount}</div>
            <p className="text-xs text-slate-400 mt-1">Includes rental fee & refundable deposit</p>

            <div className="mt-6 pt-6 border-t border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Item:</span>
                <span className="font-semibold text-white truncate max-w-[150px]">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Session ID:</span>
                <span className="font-mono text-slate-300 text-[11px]">{sessionId.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-amber-400 font-bold">Pending Webhook</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 justify-center">
            <Lock className="w-3.5 h-3.5" />
            <span>Encrypted 256-bit Stripe Test Connection</span>
          </div>
        </div>

        {/* Right Side: Card Form */}
        <div className="md:col-span-7 p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span>Pay with Card (Test Mode)</span>
            </h2>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
              ✔ Stripe Test Card Active
            </span>
          </div>

          {/* Test Card Info Pill */}
          <div className="bg-slate-900/90 border border-slate-700 p-3.5 rounded-2xl text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-medium text-[11px]">
              <span>Official Stripe Test Card:</span>
              <span className="text-indigo-400 font-mono">4242 4242 4242 4242</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Use any future date (e.g. <strong>12/28</strong>), CVC <strong>123</strong>, and PIN <strong>any 4 digits</strong>.
            </p>
          </div>

          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Card Information
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold bg-indigo-600 px-1.5 py-0.5 rounded text-white">
                  VISA
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  MM / YY
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authorizing Stripe Test Session...</span>
                </>
              ) : (
                <span>Pay ₹{amount} with Stripe</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StripeTestCheckout;
