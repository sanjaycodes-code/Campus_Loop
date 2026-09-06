import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, GraduationCap, Sparkles } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, guestLogin, authError, clearAuthError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const { email, password } = formData;

  // The route the user was trying to access before being redirected to /login
  const from = location.state?.from?.pathname || '/marketplace';

  const handleChange = (e) => {
    if (localError) setLocalError('');
    if (authError) clearAuthError();
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  const handleGuestLogin = async () => {
    if (localError) setLocalError('');
    if (authError) clearAuthError();
    setIsGuestSubmitting(true);
    const result = await guestLogin();
    setIsGuestSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0D0E15] font-sans text-slate-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#181A26] text-[#A78BFA] border border-[#2D3147] shadow-[0_0_24px_rgba(139,92,246,0.25)] mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-clash font-extrabold text-white tracking-tight">
          Welcome <span className="text-[#A78BFA]">Back</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in with your NIT Durgapur student credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#141622] py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-[#26293D]">
          {displayError && (
            <div className="mb-6 p-4 rounded-xl bg-[#2B1118]/80 border border-[#E11D48]/50 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold text-rose-200">Authentication Failed</p>
                <p className="mt-0.5 text-xs text-rose-300">{displayError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Institute Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  placeholder="ksv.24u10658@nitdgp.ac.in"
                  required
                  className="w-full pl-11 pr-4 py-2.5 bg-[#0D0E15] border border-[#26293D] rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={handleChange}
                  placeholder="Your password"
                  required
                  className="w-full pl-11 pr-11 py-2.5 bg-[#0D0E15] border border-[#26293D] rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isGuestSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.35)] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed btn-press-snap cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#26293D]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-[#141622] px-2.5 text-slate-400 font-bold">Or explore without an account</span>
            </div>
          </div>

          {/* Guest / Demo Mode Button */}
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={isGuestSubmitting || isSubmitting}
            className="w-full py-2.5 px-4 bg-[#181A26] hover:bg-[#1F2233] text-slate-200 hover:text-white text-xs sm:text-sm font-bold rounded-xl border border-[#26293D] transition-all flex items-center justify-center gap-2 btn-press-snap cursor-pointer disabled:opacity-60 shadow-md"
          >
            {isGuestSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#8B5CF6]/40 border-t-[#8B5CF6] rounded-full animate-spin"></div>
                <span>Initializing Demo Session...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#A78BFA]" />
                <span>Continue as Guest (Demo Mode)</span>
              </>
            )}
          </button>

          <div className="mt-6 pt-6 border-t border-[#1F2233] text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-[#A78BFA] hover:text-[#C4B5FD] hover:underline inline-flex items-center gap-1 transition-colors"
              >
                Register now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
