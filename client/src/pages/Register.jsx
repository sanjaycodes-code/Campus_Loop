import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

const NITDGP_EMAIL_REGEX = /^[a-z]+\.\d{2}[A-Za-z]\d{4,6}@nitdgp\.ac\.in$/;

const Register = () => {
  const navigate = useNavigate();
  const { register, authError, clearAuthError } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    campus: 'NIT Durgapur',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const { name, email, password, campus, phone } = formData;

  const isEmailValid = email.trim() === '' ? null : NITDGP_EMAIL_REGEX.test(email.trim());

  const handleChange = (e) => {
    if (localError) setLocalError('');
    if (authError) clearAuthError();
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (!NITDGP_EMAIL_REGEX.test(email.trim())) {
      setLocalError(
        'Registration is restricted to official NIT Durgapur emails (e.g. ksv.24U10658@nitdgp.ac.in).'
      );
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      password,
      campus: campus.trim(),
      phone: phone.trim(),
    });
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-500/20 mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Join CampusLoop
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Peer-to-peer equipment and book rentals for NIT Durgapur students
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100">
          {displayError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Issue</p>
                <p className="mt-0.5 text-xs text-rose-600">{displayError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={handleChange}
                  placeholder="e.g. K. S. Vardhan"
                  required
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {/* Institute Email */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  NIT Durgapur Email <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-sky-600 font-medium bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                  @nitdgp.ac.in only
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  placeholder="ksv.24U10658@nitdgp.ac.in"
                  required
                  className={`w-full pl-11 pr-10 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-colors ${
                    isEmailValid === true
                      ? 'border-emerald-400 focus:ring-emerald-500/20 focus:border-emerald-500'
                      : isEmailValid === false
                      ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                      : 'border-slate-200 focus:ring-sky-500/20 focus:border-sky-500'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  {isEmailValid === true && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  {isEmailValid === false && (
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  )}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Format: <code className="text-sky-700 bg-sky-50 px-1 py-0.5 rounded font-mono">initials.admissionYearSectionRoll@nitdgp.ac.in</code>
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
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

            {/* Campus & Phone (2-column layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Campus
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="campus"
                    value={campus}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-sky-600/20 hover:shadow-sky-600/30 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Student Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-1"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
