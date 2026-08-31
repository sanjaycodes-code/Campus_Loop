import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  Search,
  Filter,
  Laptop,
  BookOpen,
  Headphones,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  ShieldCheck,
  Tag,
  Sparkles,
  MapPin,
  ShoppingBag,
  X,
  RotateCcw,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: Sparkles },
  { id: 'device', label: 'Devices', icon: Laptop },
  { id: 'book', label: 'Books', icon: BookOpen },
  { id: 'gadget', label: 'Gadgets', icon: Headphones },
];

const CONDITIONS = [
  { id: 'all', label: 'All Conditions' },
  { id: 'brand_new', label: 'Brand New' },
  { id: 'like_new', label: 'Like New' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
];

const Marketplace = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { socket } = useSocket();

  // Read initial filter values from URL query string
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialCondition = searchParams.get('condition') || 'all';
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';
  const initialAvailability = searchParams.get('isAvailable') || 'all';
  const initialSort = searchParams.get('sort') || 'createdAt:desc';
  const initialPage = parseInt(searchParams.get('page'), 10) || 1;

  // Local state for UI controls
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [condition, setCondition] = useState(initialCondition);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [isAvailable, setIsAvailable] = useState(initialAvailability);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  // Debounced search text state
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // Mobile sidebar filter toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Data fetching state
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 1. Debounce Search Input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // 2. Synchronize URL query params whenever filters change
  useEffect(() => {
    const params = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (category && category !== 'all') params.category = category;
    if (condition && condition !== 'all') params.condition = condition;
    if (minPrice !== '') params.minPrice = minPrice;
    if (maxPrice !== '') params.maxPrice = maxPrice;
    if (isAvailable !== 'all') params.isAvailable = isAvailable;
    if (sort !== 'createdAt:desc') params.sort = sort;
    if (page > 1) params.page = page.toString();

    setSearchParams(params, { replace: true });
  }, [debouncedSearch, category, condition, minPrice, maxPrice, isAvailable, sort, page, setSearchParams]);

  // 3. Fetch listings from API with all active filters combined (AND logic)
  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 12,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (category && category !== 'all') params.category = category;
      if (condition && condition !== 'all') params.condition = condition;
      if (minPrice !== '') params.minPrice = minPrice;
      if (maxPrice !== '') params.maxPrice = maxPrice;
      if (isAvailable !== 'all') params.isAvailable = isAvailable;
      if (sort) params.sort = sort;

      const res = await api.get('/listings', { params });
      if (res.data.success) {
        setListings(res.data.listings);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Fetch listings error:', err);
      setError('Failed to load listings. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, condition, minPrice, maxPrice, isAvailable, sort, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // 4. Real-time availability status listener (Socket.io)
  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (data) => {
      console.log(
        `%c[Socket.io] Realtime Status Update for "${data.title}": isAvailable -> ${data.isAvailable}`,
        'color: #0284c7; font-weight: bold; background: #f0f9ff; padding: 2px 6px; border-radius: 4px;'
      );

      setListings((prevListings) =>
        prevListings.map((item) =>
          item._id === data.listingId
            ? { ...item, isAvailable: data.isAvailable, status: data.status }
            : item
        )
      );
    };

    socket.on('listing:statusChanged', handleStatusChanged);

    return () => {
      socket.off('listing:statusChanged', handleStatusChanged);
    };
  }, [socket]);

  // Reset page to 1 when primary filters change
  const handleCategoryChange = (catId) => {
    setCategory(catId);
    setPage(1);
  };

  const handleConditionChange = (condId) => {
    setCondition(condId);
    setPage(1);
  };

  const handleAvailabilityChange = (val) => {
    setIsAvailable(val);
    setPage(1);
  };

  const handleSortChange = (sortVal) => {
    setSort(sortVal);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('all');
    setCondition('all');
    setMinPrice('');
    setMaxPrice('');
    setIsAvailable('all');
    setSort('createdAt:desc');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      debouncedSearch.trim() !== '' ||
      category !== 'all' ||
      condition !== 'all' ||
      minPrice !== '' ||
      maxPrice !== '' ||
      isAvailable !== 'all' ||
      sort !== 'createdAt:desc'
    );
  }, [debouncedSearch, category, condition, minPrice, maxPrice, isAvailable, sort]);

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
    <div className="min-h-screen bg-slate-50/80 flex flex-col font-sans text-slate-800">
      <Navbar />

      {/* Hero / Banner Header */}
      <section className="bg-white border-b border-slate-200/70 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-semibold mb-2 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>NIT Durgapur Verified Peer Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Campus Rental Marketplace
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Borrow & share scientific calculators, engineering textbooks, lab supplies, and tech accessories.
            </p>
          </div>

          <Link
            to="/listings/new"
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List an Item</span>
          </Link>
        </div>
      </section>

      {/* Main Container with Sidebar + Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* ================= LEFT SIDEBAR (Desktop) ================= */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6 sticky top-24 self-start">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Search & Filters</span>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* 1. Category Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Category
                </label>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/80 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span>{cat.label}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Price Range (Min & Max Daily Rate) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Daily Rate (₹ / day)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={minPrice}
                        onChange={(e) => {
                          setMinPrice(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Min"
                        className="w-full pl-6 pr-2.5 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Max"
                        className="w-full pl-6 pr-2.5 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
                {minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice) && (
                  <p className="text-[10px] text-amber-600 mt-1.5 font-medium">
                    Min rate exceeds Max rate.
                  </p>
                )}
              </div>

              {/* 3. Availability Filter (Segmented Control) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Availability
                </label>
                <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-3 gap-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'true', label: 'In Stock' },
                    { id: 'false', label: 'Rented' },
                  ].map((item) => {
                    const isSelected = isAvailable === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleAvailabilityChange(item.id)}
                        className={`py-1.5 px-2 rounded-lg text-xs transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-white text-slate-900 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 font-medium'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Condition Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Item Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => handleConditionChange(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* ================= RIGHT COLUMN (Search + Grid) ================= */}
          <main className="lg:col-span-3 space-y-6">
            {/* Top Search Bar & Sort Row */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Box */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search calculators, books, lab coats, components..."
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setDebouncedSearch('');
                      setPage(1);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Toggle & Sort Dropdown */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Filters</span>
                </button>

                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
                >
                  <option value="createdAt:desc">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Mobile Filter Drawer */}
            {showMobileFilters && (
              <div className="lg:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-sm text-slate-900">Filters</span>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-xs font-semibold text-indigo-600"
                  >
                    Done
                  </button>
                </div>

                {/* Mobile Categories */}
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                        category === cat.id
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Mobile Price */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min Price ₹"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max Price ₹"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>

                {/* Mobile Reset */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}

            {/* Active Filter Chips Bar */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Applied:</span>

                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-medium">
                    Search: "{debouncedSearch}"
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-indigo-900"
                      onClick={() => {
                        setSearch('');
                        setDebouncedSearch('');
                        setPage(1);
                      }}
                    />
                  </span>
                )}

                {category !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-medium">
                    Category: {CATEGORIES.find((c) => c.id === category)?.label}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-indigo-900"
                      onClick={() => handleCategoryChange('all')}
                    />
                  </span>
                )}

                {condition !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-medium">
                    Condition: {CONDITIONS.find((c) => c.id === condition)?.label}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-indigo-900"
                      onClick={() => handleConditionChange('all')}
                    />
                  </span>
                )}

                {(minPrice !== '' || maxPrice !== '') && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-medium">
                    Price: ₹{minPrice || 0} – ₹{maxPrice || '∞'}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-indigo-900"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                        setPage(1);
                      }}
                    />
                  </span>
                )}

                {isAvailable !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-medium">
                    {isAvailable === 'true' ? 'In Stock Only' : 'Rented Only'}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-indigo-900"
                      onClick={() => handleAvailabilityChange('all')}
                    />
                  </span>
                )}

                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 ml-1 cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Results Counter */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <p>
                Showing <strong className="text-slate-900 font-bold">{totalCount}</strong> matching item{totalCount === 1 ? '' : 's'}
              </p>
              <p className="hidden sm:block text-[11px] text-slate-400 font-medium">
                NIT Durgapur Student Exchange
              </p>
            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs animate-pulse"
                  >
                    <div className="h-44 bg-slate-200/70"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-slate-200/70 rounded w-1/3"></div>
                      <div className="h-5 bg-slate-200/70 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200/70 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error View */}
            {error && (
              <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-center">
                <p className="font-semibold text-sm">{error}</p>
                <button
                  onClick={fetchListings}
                  className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && listings.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs max-w-md mx-auto my-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No matching items found</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {hasActiveFilters
                    ? 'No items matched all your active search and price criteria. Try relaxing your filters or searching a different term.'
                    : 'There are currently no items listed for rent. Be the first on campus to post!'}
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  {hasActiveFilters ? (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <Link
                      to="/listings/new"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      Post an Item
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Listings Grid */}
            {!loading && !error && listings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {listings.map((item) => {
                  const primaryImage =
                    item.images && item.images.length > 0 ? item.images[0] : null;

                  return (
                    <Link
                      key={item._id}
                      to={`/listings/${item._id}`}
                      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                    >
                      {/* Card Image / Themed Empty State Placeholder */}
                      <div className="relative h-44 overflow-hidden flex items-center justify-center bg-slate-100">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          /* Intentional Themed Category Placeholder */
                          <div
                            className={`w-full h-full flex flex-col items-center justify-center relative ${
                              item.category === 'book'
                                ? 'bg-gradient-to-br from-amber-50 via-orange-50/60 to-amber-100/50'
                                : item.category === 'device'
                                ? 'bg-gradient-to-br from-indigo-50 via-sky-50/50 to-indigo-100/40'
                                : 'bg-gradient-to-br from-violet-50 via-purple-50/50 to-violet-100/40'
                            }`}
                          >
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200/60 flex items-center justify-center text-slate-700 group-hover:scale-105 transition-transform">
                              {item.category === 'book' && <BookOpen className="w-7 h-7 text-amber-700" />}
                              {item.category === 'device' && <Laptop className="w-7 h-7 text-indigo-600" />}
                              {item.category === 'gadget' && <Headphones className="w-7 h-7 text-violet-600" />}
                            </div>
                            <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {item.category === 'book'
                                ? 'Academic Text'
                                : item.category === 'device'
                                ? 'Hardware Gear'
                                : 'Campus Gadget'}
                            </span>
                          </div>
                        )}

                        {/* Category Tag Overlay (Subtle, non-competing) */}
                        <div className="absolute top-3 left-3">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border backdrop-blur-md shadow-2xs ${getCategoryBadgeColor(
                              item.category
                            )}`}
                          >
                            {item.category}
                          </span>
                        </div>

                        {/* Availability Status Pill (Primary Status Indicator) */}
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
                            {item.isAvailable ? 'Available' : 'Rented'}
                          </span>
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Condition & Campus Tag */}
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span className="capitalize font-semibold text-slate-500 text-[11px]">
                              {item.condition?.replace('_', ' ')}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 truncate max-w-[120px]">
                              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              {item.location || item.campus || 'NIT Durgapur'}
                            </span>
                          </div>

                          {/* Item Title */}
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {item.title}
                          </h3>

                          {/* Item Description */}
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                            {item.description}
                          </p>
                        </div>

                        {/* Card Bottom Row: Bold Price & Lister Info */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-baseline">
                            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                              ₹{item.pricePerDay}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium ml-1">/ day</span>
                          </div>

                          {/* Lister Verified Student Pill */}
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold flex items-center justify-center">
                              {(item.owner?.name || 'S')[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-slate-600 truncate max-w-[80px]">
                              {item.owner?.name?.split(' ')[0] || 'Student'}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-bold text-slate-600 px-3">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
