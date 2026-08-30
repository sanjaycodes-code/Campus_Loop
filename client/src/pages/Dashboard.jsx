import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  User,
  Mail,
  Building,
  Phone,
  ShieldCheck,
  CheckCircle,
  RefreshCw,
  Clock,
  ShoppingBag,
  PlusCircle,
  ListOrdered,
  ArrowRight,
} from 'lucide-react';

const Dashboard = () => {
  const { user, token, logout } = useAuth();
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Test authenticated request using our axios interceptor
  const handleTestProtectedApi = async () => {
    setIsLoadingApi(true);
    try {
      const res = await api.get('/auth/me');
      setApiResponse({
        status: res.status,
        data: res.data,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      setApiResponse({
        status: err.response?.status || 500,
        error: err.response?.data || err.message,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsLoadingApi(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link
            to="/marketplace"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Explore Marketplace</h3>
                <p className="text-xs text-slate-500">Rent calculators, lab gear, books</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            to="/listings/new"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Post an Item for Rent</h3>
                <p className="text-xs text-slate-500">Earn from unused gear</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            to="/my-listings"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ListOrdered className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">My Listings</h3>
                <p className="text-xs text-slate-500">Manage posted items</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-sky-500/20">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Verified Student
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs text-slate-500 font-medium">Institute Email</p>
                  <p className="text-slate-800 font-mono text-xs truncate">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Building className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">Campus</p>
                  <p className="text-slate-800 font-medium">{user?.campus || 'NIT Durgapur'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">Phone</p>
                  <p className="text-slate-800 font-medium">{user?.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">Role</p>
                  <p className="text-slate-800 capitalize font-medium">{user?.role || 'Student'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Session & API Interceptor Diagnostics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Banner */}
            <div className="bg-gradient-to-r from-sky-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-sky-600/10">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-sky-200 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold">Authentication Active & Protected</h3>
                  <p className="text-sm text-sky-100 mt-1">
                    Your session is active as <span className="font-semibold text-white">{user?.email}</span>. You can browse the marketplace, post items, and manage your inventory.
                  </p>
                </div>
              </div>
            </div>

            {/* Test Axios Interceptor Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900">Axios Interceptor Diagnostic</h3>
                  <p className="text-xs text-slate-500">
                    Verify that your Axios instance automatically attaches the JWT header to <code className="font-mono bg-slate-100 px-1 rounded">GET /api/auth/me</code>
                  </p>
                </div>
                <button
                  onClick={handleTestProtectedApi}
                  disabled={isLoadingApi}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApi ? 'animate-spin' : ''}`} />
                  <span>{isLoadingApi ? 'Sending...' : 'Test Request'}</span>
                </button>
              </div>

              {apiResponse ? (
                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 mb-2">
                    <span>HTTP Status: {apiResponse.status}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {apiResponse.timestamp}
                    </span>
                  </div>
                  <pre>{JSON.stringify(apiResponse.data || apiResponse.error, null, 2)}</pre>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Click <strong>Test Request</strong> to execute an authenticated test call.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
