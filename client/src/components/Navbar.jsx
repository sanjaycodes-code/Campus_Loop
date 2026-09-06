import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  PlusCircle,
  ShoppingBag,
  ListOrdered,
  LogOut,
  User,
  Menu,
  X,
  Sparkles,
  MessageSquare,
  Calendar,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const isGuest = user?.isGuest || user?.email === 'guest@nitdgp.ac.in';

  return (
    <header className="bg-[#0D0E15]/95 backdrop-blur-md border-b border-[#1F2233] sticky top-0 z-30 shadow-2xs font-sans">
      {/* Persistent Guest / Demo Mode Alert Banner */}
      {isGuest && (
        <div className="bg-gradient-to-r from-violet-950 via-[#1F1838] to-purple-950 text-white border-b border-violet-800/40 text-[11px] sm:text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-[#C4B5FD]" />
          <span>
            <strong className="text-[#C4B5FD]">Demo / Guest Mode Active:</strong> You are exploring as <em>Guest Reviewer</em>. Pre-seeded items, booking lifecycles, and Stripe test checkout are enabled.
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo with Clash Display Wordmark */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white shadow-[0_0_16px_rgba(139,92,246,0.35)] group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-clash font-bold text-xl tracking-tight text-white group-hover:text-[#A78BFA] transition-colors">
                CampusLoop
              </span>
              <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#181A26] text-[#C4B5FD] border border-[#2D3147]">
                NIT DGP
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <Link
              to="/marketplace"
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive('/marketplace') || isActive('/')
                  ? 'text-[#C4B5FD] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 font-semibold shadow-2xs'
                  : 'text-slate-400 hover:text-white hover:bg-[#141622]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Explore Items</span>
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/my-listings"
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive('/my-listings')
                      ? 'text-[#C4B5FD] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 font-semibold shadow-2xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#141622]'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>My Listings</span>
                </Link>

                <Link
                  to="/bookings"
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive('/bookings')
                      ? 'text-[#C4B5FD] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 font-semibold shadow-2xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#141622]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Bookings</span>
                </Link>

                <Link
                  to="/messages"
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive('/messages') || isActive('/chat')
                      ? 'text-[#C4B5FD] bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 font-semibold shadow-2xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#141622]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Messages</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/listings/new"
                  className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-full shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-[#A78BFA]/30 btn-press-snap transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>List an Item</span>
                </Link>

                <div className="h-5 w-px bg-[#26293D] mx-1"></div>

                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#141622] hover:bg-[#181A28] border border-[#26293D] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-violet-950 text-[#C4B5FD] font-bold text-xs flex items-center justify-center border border-violet-700/50">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white leading-tight">
                      {user?.name?.split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400">{isGuest ? 'Guest Reviewer' : 'Student'}</p>
                  </div>
                </Link>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-[#181A26] rounded-full transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#141622] rounded-full transition-colors btn-press-snap"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-full shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-[#A78BFA]/30 transition-all btn-press-snap"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && (
              <Link
                to="/listings/new"
                className="p-2 bg-[#8B5CF6] text-white rounded-full shadow-sm btn-press-snap"
              >
                <PlusCircle className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#141622] btn-press-snap cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1F2233] bg-[#0D0E15] px-4 pt-3 pb-6 space-y-2 shadow-2xl">
          <Link
            to="/marketplace"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#141622]"
          >
            <ShoppingBag className="w-4 h-4 text-[#A78BFA]" />
            <span>Explore Items</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/listings/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-white bg-[#8B5CF6]/20 border border-[#8B5CF6]/40"
              >
                <PlusCircle className="w-4 h-4 text-[#C4B5FD]" />
                <span>List an Item</span>
              </Link>
              <Link
                to="/my-listings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#141622]"
              >
                <ListOrdered className="w-4 h-4 text-[#A78BFA]" />
                <span>My Listings</span>
              </Link>
              <Link
                to="/bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#141622]"
              >
                <Calendar className="w-4 h-4 text-[#A78BFA]" />
                <span>Bookings</span>
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#141622]"
              >
                <User className="w-4 h-4 text-[#A78BFA]" />
                <span>Profile ({user?.name})</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/20 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-full border border-[#26293D] text-xs font-semibold text-slate-300 bg-[#141622]"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-full bg-[#8B5CF6] text-xs font-semibold text-white shadow-[0_0_16px_rgba(139,92,246,0.3)]"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
