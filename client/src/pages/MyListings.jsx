import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ListingImage from '../components/ListingImage';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ListOrdered,
  PlusCircle,
  Edit,
  ExternalLink,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

const MyListings = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyListings = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/listings?owner=${user._id}&limit=50`);
      if (res.data.success) {
        setListings(res.data.listings);
      }
    } catch (err) {
      console.error('Fetch my listings error:', err);
      setError('Could not load your listings.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  const getCategoryBadgeColor = (cat) => {
    switch (cat) {
      case 'device':
        return 'bg-indigo-50/90 text-indigo-700 border-indigo-200/80';
      case 'book':
        return 'bg-amber-50/90 text-amber-800 border-amber-200/80';
      case 'gadget':
        return 'bg-violet-50/90 text-violet-700 border-violet-200/80';
      default:
        return 'bg-slate-50/90 text-slate-700 border-slate-200/80';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col font-sans text-slate-800">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Rental Listings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage your posted items, toggle availability, and track incoming student rentals.
            </p>
          </div>

          <Link
            to="/listings/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all self-start sm:self-auto cursor-pointer btn-press-snap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post New Item</span>
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-200/70 rounded-2xl"></div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-center">
            <p className="font-semibold text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center max-w-md mx-auto my-8 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
              <ListOrdered className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">You haven't listed any items yet</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Have extra textbooks, an unused calculator, or lab supplies? List them to start earning on campus!
            </p>
            <Link
              to="/listings/new"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs btn-press-snap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Listing</span>
            </Link>
          </div>
        )}

        {!loading && !error && listings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <div
                key={item._id}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 card-hover-lift transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* 1. Shared Fixed-Aspect-Ratio Listing Image */}
                <ListingImage
                  images={item.images}
                  imageUrl={item.imageUrl}
                  category={item.category}
                  title={item.title}
                  aspectRatio="h-44"
                >
                  {/* Category Tag Overlay */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border backdrop-blur-md shadow-2xs ${getCategoryBadgeColor(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>
                  </div>

                  {/* Availability Status Pill Overlay */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md shadow-xs ${
                        item.isAvailable
                          ? 'bg-white/95 text-emerald-700 border-emerald-200/90'
                          : 'bg-slate-900/90 text-slate-200 border-slate-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {item.isAvailable ? 'Available' : 'Rented / Busy'}
                    </span>
                  </div>
                </ListingImage>

                {/* 2. Card Content Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="capitalize font-semibold text-slate-500 text-[11px]">
                        {item.condition?.replace('_', ' ')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 truncate max-w-[120px]">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {item.location || item.campus || 'NIT Durgapur'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-baseline">
                      <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        ₹{item.pricePerDay}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium ml-1">/ day</span>
                    </div>
                  </div>
                </div>

                {/* 3. Host Action Footer */}
                <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/listings/${item._id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                  >
                    <span>View Public Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={`/listings/${item._id}/edit`}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors shadow-2xs btn-press-snap"
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Edit</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyListings;
