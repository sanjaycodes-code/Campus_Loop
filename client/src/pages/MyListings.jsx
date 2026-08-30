import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ListOrdered,
  PlusCircle,
  Edit,
  Trash2,
  ExternalLink,
  Laptop,
  BookOpen,
  Headphones,
  CheckCircle,
  AlertCircle,
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              My Rental Listings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your posted items, toggle availability, and track incoming rentals.
            </p>
          </div>

          <Link
            to="/listings/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-sky-600/20 active:scale-[0.98] transition-all self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post New Item</span>
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-center">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
              <ListOrdered className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">You haven't listed any items yet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Have extra textbooks, an unused calculator, or lab supplies? List them to start earning on campus!
            </p>
            <Link
              to="/listings/new"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all"
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
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.isAvailable ? 'Available' : 'Rented/Paused'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-extrabold text-slate-900 text-base">₹{item.pricePerDay}</span>
                      <span className="text-slate-500"> / day</span>
                    </div>
                    <span className="text-slate-400 capitalize">{item.condition?.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/listings/${item._id}`}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"
                  >
                    <span>View Public Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={`/listings/${item._id}/edit`}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-sky-600" />
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
