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
  Clock,
} from 'lucide-react';
import useScrollZoom from '../hooks/useScrollZoom';
import ListingImage from '../components/ListingImage';

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

  // Headline Font Choice for Dark NFT aesthetic ('clash' | 'space')
  const [headlineFont, setHeadlineFont] = useState(
    searchParams.get('font') === 'space' ? 'space' : 'clash'
  );

  // GSAP ScrollTrigger Hero Zoom & Parallax Hook
  const {
    containerRef: heroContainerRef,
    visualRef: heroVisualRef,
    textRef: heroTextRef,
  } = useScrollZoom({
    zoomScale: 1.15,
    textParallaxY: -22,
    textFade: 0.82,
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
  });

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

  // Progressive Cold-Start Timer state
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

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

  // Real-time animation pulse indicator
  const [recentlyUpdatedListingId, setRecentlyUpdatedListingId] = useState(null);

  // 4. Real-time availability status listener (Socket.io)
  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (data) => {
      console.log(
        `%c[Socket.io] Realtime Status Update for "${data.title}": isAvailable -> ${data.isAvailable}`,
        'color: #0284c7; font-weight: bold; background: #f0f9ff; padding: 2px 6px; border-radius: 4px;'
      );

      // Trigger status pulse animation on the specific card
      if (data.listingId) {
        setRecentlyUpdatedListingId(data.listingId);
        setTimeout(() => setRecentlyUpdatedListingId(null), 1500);
      }

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
    switch (cat?.toLowerCase()) {
      case 'device':
        return 'bg-[#0F172A]/95 text-[#38BDF8] border-[#0284C7]/60 shadow-[0_2px_10px_rgba(2,132,199,0.2)]';
      case 'book':
        return 'bg-[#261B0E]/95 text-[#FBBF24] border-[#D97706]/60 shadow-[0_2px_10px_rgba(217,119,6,0.2)]';
      case 'gadget':
        return 'bg-[#26103D]/95 text-[#C084FC] border-[#A855F7]/60 shadow-[0_2px_10px_rgba(168,85,247,0.2)]';
      default:
        return 'bg-[#181A26]/95 text-[#C4B5FD] border-[#8B5CF6]/40 shadow-xs';
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E15] flex flex-col font-sans text-slate-200 selection:bg-[#8B5CF6]/30 selection:text-white">
      <Navbar />

      {/* ========================================================================= */}
      {/* HERO SECTION — Dark Modern NFT-Marketplace Aesthetic (Review Prototype) */}
      {/* ========================================================================= */}
      <section
        ref={heroContainerRef}
        className="relative bg-[#0D0E15] border-b border-[#1F2233] pt-12 pb-14 px-4 sm:px-6 lg:px-8 overflow-hidden text-white"
      >
        {/* Ambient Purple-to-Violet Glow Overlay (Restrained & dialed-back) */}
        <div
          ref={heroVisualRef}
          className="absolute inset-0 pointer-events-none origin-center"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(139, 92, 246, 0.11) 0%, rgba(99, 102, 241, 0.03) 45%, transparent 70%)',
          }}
        />
        {/* Subtle grid pattern / grain texture backdrop */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        {/* Bottom subtle dark fade to section boundary */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0D0E15] to-transparent pointer-events-none" />

        <div
          ref={heroTextRef}
          className="max-w-7xl mx-auto relative z-10 space-y-8"
        >
          {/* Top Row: Title, Subtitle, & Primary Pill CTA */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl space-y-3.5">
              {/* Verified Pill Badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#181A26] border border-[#2D3147] text-[#C4B5FD] text-xs font-semibold shadow-inner">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>NIT Durgapur Verified Peer Network</span>
                </div>
              </div>

              {/* Locked-in Headline: Clash Display (Approved Modern Geometric Marketplace Display Font) */}
              <h1 className="font-clash text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.12]">
                Campus Rental <span className="text-[#A78BFA]">Marketplace</span>
              </h1>

              {/* Supporting Sans-Serif Subtext */}
              <p className="text-sm sm:text-base text-slate-400 font-sans font-normal leading-relaxed max-w-xl">
                Borrow and exchange scientific calculators, lab drafters, engineering textbooks, and tech gear directly with verified peers on campus.
              </p>
            </div>

            {/* Pill-shaped CTAs */}
            <div className="flex items-center gap-3 self-start lg:self-end flex-wrap">
              <Link
                to="/listings/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-sans font-semibold text-sm shadow-[0_0_24px_rgba(139,92,246,0.38)] border border-[#A78BFA]/30 btn-press-snap transition-all duration-200 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>List an Item</span>
              </Link>

              <a
                href="#marketplace-grid"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#141622] hover:bg-[#1C1F2E] text-slate-300 hover:text-white font-sans font-medium text-sm border border-[#26293D] transition-all duration-200 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#A78BFA]" />
                <span>Explore Gear</span>
              </a>
            </div>
          </div>

          {/* Stats Row: Clean Dark Cards (NFT Marketplace Style) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { label: 'Active Listings', value: '540+', sub: 'Available today' },
              { label: 'Verified Students', value: '1.2k+', sub: '@nitdgp.ac.in' },
              { label: 'Rental Success', value: '99.4%', sub: 'Zero disputes' },
              { label: 'Platform Fee', value: '₹0', sub: 'Peer-to-peer' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-[#141622]/90 hover:bg-[#181A28] border border-[#26293D] hover:border-[#383D59] rounded-2xl p-4 transition-colors duration-200 flex flex-col justify-between"
              >
                <div className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1">
                  <div className="text-xs font-semibold text-slate-300 font-sans">{stat.label}</div>
                  <div className="text-[11px] text-slate-500 font-sans">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Container with Full-Height Sidebar Panel + Grid Area */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row border-x border-[#1F2233] bg-[#0D0E15] min-h-[calc(100vh-260px)]">
        {/* ================= LEFT FULL-HEIGHT SIDEBAR PANEL (Desktop) ================= */}
        <aside className="hidden lg:flex lg:w-72 lg:flex-col shrink-0 bg-[#0D0E15] border-r border-[#1F2233] p-6 space-y-6">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#1F2233]">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>Filters & Browse</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[11px] font-semibold text-[#FB7185] hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors btn-press-snap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* 1. Category Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
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
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 btn-press-snap cursor-pointer ${
                      isSelected
                        ? 'bg-[#8B5CF6] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
                        : 'text-slate-300 hover:bg-[#141622] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span>{cat.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Price Range (Min & Max Daily Rate) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Daily Rate (₹ / day)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Min"
                    className="w-full pl-6 pr-2.5 py-1.5 h-9 bg-[#141622] border border-[#26293D] rounded-xl text-xs font-medium text-white placeholder:text-slate-500 focus:bg-[#181A28] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] transition-all duration-150 shadow-2xs"
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Max"
                    className="w-full pl-6 pr-2.5 py-1.5 h-9 bg-[#141622] border border-[#26293D] rounded-xl text-xs font-medium text-white placeholder:text-slate-500 focus:bg-[#181A28] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] transition-all duration-150 shadow-2xs"
                  />
                </div>
              </div>
            </div>
            {minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice) && (
              <p className="text-[10px] text-amber-400 mt-1.5 font-medium">
                Min rate exceeds Max rate.
              </p>
            )}
          </div>

          {/* 3. Availability Filter (Segmented Control) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Availability
            </label>
            <div className="bg-[#141622] border border-[#26293D] p-1 rounded-xl grid grid-cols-3 gap-1">
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
                    className={`py-1.5 px-2 rounded-lg text-xs transition-all duration-150 text-center cursor-pointer btn-press-snap ${
                      isSelected
                        ? 'bg-[#8B5CF6] text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white font-medium'
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
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Item Condition
            </label>
            <select
              value={condition}
              onChange={(e) => handleConditionChange(e.target.value)}
              className="w-full h-9 px-3 bg-[#141622] border border-[#26293D] rounded-xl text-xs text-white font-medium focus:bg-[#181A28] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] transition-all duration-150 cursor-pointer shadow-2xs"
            >
              {CONDITIONS.map((cond) => (
                <option key={cond.id} value={cond.id} className="bg-[#141622] text-white">
                  {cond.label}
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* ================= RIGHT RESULTS AREA ================= */}
        <main id="marketplace-grid" className="flex-1 bg-[#0D0E15] p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Top Search Bar & Sort Row */}
            <div className="bg-[#141622] p-3 sm:p-4 rounded-2xl border border-[#26293D] shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Box */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                  className="w-full pl-10 pr-9 py-2.5 bg-[#0D0E15] border border-[#26293D] rounded-xl text-white placeholder:text-slate-500 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] transition-all"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setDebouncedSearch('');
                      setPage(1);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Toggle & Sort Dropdown */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden px-3.5 py-2.5 bg-[#0D0E15] hover:bg-[#181A28] text-slate-300 border border-[#26293D] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Filter className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>Filters</span>
                </button>

                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="py-2.5 px-3 bg-[#0D0E15] border border-[#26293D] rounded-xl text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] cursor-pointer transition-all"
                >
                  <option value="createdAt:desc" className="bg-[#0D0E15] text-white">Newest First</option>
                  <option value="price_asc" className="bg-[#0D0E15] text-white">Price: Low to High</option>
                  <option value="price_desc" className="bg-[#0D0E15] text-white">Price: High to Low</option>
                  <option value="oldest" className="bg-[#0D0E15] text-white">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Mobile Filter Drawer */}
            {showMobileFilters && (
              <div className="lg:hidden bg-[#141622] p-5 rounded-2xl border border-[#26293D] shadow-lg space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#26293D]">
                  <span className="font-bold text-sm text-white">Filters</span>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-xs font-semibold text-[#A78BFA] hover:text-white"
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        category === cat.id
                          ? 'bg-[#8B5CF6] text-white font-semibold shadow-xs'
                          : 'bg-[#0D0E15] border border-[#26293D] text-slate-300'
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
                    className="px-3 py-2 bg-[#0D0E15] border border-[#26293D] rounded-lg text-xs font-medium text-white placeholder:text-slate-500"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max Price ₹"
                    className="px-3 py-2 bg-[#0D0E15] border border-[#26293D] rounded-lg text-xs font-medium text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Mobile Reset */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-2 bg-[#24141E] text-[#FB7185] border border-[#441D29] rounded-xl text-xs font-semibold"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}

            {/* Active Filter Chips Bar */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Applied:</span>

                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181A26] text-[#C4B5FD] border border-[#2D3147] font-medium shadow-inner">
                    Search: "{debouncedSearch}"
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => {
                        setSearch('');
                        setDebouncedSearch('');
                        setPage(1);
                      }}
                    />
                  </span>
                )}

                {category !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181A26] text-[#C4B5FD] border border-[#2D3147] font-medium shadow-inner">
                    Category: {CATEGORIES.find((c) => c.id === category)?.label}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => handleCategoryChange('all')}
                    />
                  </span>
                )}

                {condition !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181A26] text-[#C4B5FD] border border-[#2D3147] font-medium shadow-inner">
                    Condition: {CONDITIONS.find((c) => c.id === condition)?.label}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => handleConditionChange('all')}
                    />
                  </span>
                )}

                {(minPrice !== '' || maxPrice !== '') && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181A26] text-[#C4B5FD] border border-[#2D3147] font-medium shadow-inner">
                    Price: ₹{minPrice || 0} – ₹{maxPrice || '∞'}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                        setPage(1);
                      }}
                    />
                  </span>
                )}

                {isAvailable !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181A26] text-[#C4B5FD] border border-[#2D3147] font-medium shadow-inner">
                    {isAvailable === 'true' ? 'In Stock Only' : 'Rented Only'}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-white"
                      onClick={() => handleAvailabilityChange('all')}
                    />
                  </span>
                )}

                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-[#FB7185] hover:text-rose-400 ml-1 cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Results Counter & Progressive Loading Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              {loading ? (
                <div className="flex items-center gap-2 text-[#A78BFA] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6]/60 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B5CF6]"></span>
                  </span>
                  <span>
                    {loadingSeconds >= 4
                      ? `Connecting to campus cloud (${loadingSeconds}s)...`
                      : 'Fetching available campus items...'}
                  </span>
                </div>
              ) : (
                <p>
                  Showing <strong className="text-white font-bold">{totalCount}</strong> matching item{totalCount === 1 ? '' : 's'}
                </p>
              )}
              <p className="hidden sm:block text-[11px] text-slate-500 font-medium">
                NIT Durgapur Student Exchange
              </p>
            </div>

            {/* Cold Start Notice (Appears if Render server is spinning up from idle) */}
            {loading && loadingSeconds >= 4 && (
              <div className="p-3.5 bg-[#1A1612] border border-[#3D3222] rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-200 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#2D2418] flex items-center justify-center flex-shrink-0 text-amber-400">
                    <Clock className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-300">Waking up Render backend cloud...</span>
                    <span className="hidden sm:inline text-amber-400/80 text-[11px] ml-1.5">
                      (Render free tier spins down after 15m idle; once awake, queries are instant!)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold bg-[#141622] px-2.5 py-1 rounded-lg border border-[#3D3222] text-amber-300 shrink-0 shadow-2xs">
                  {loadingSeconds}s
                </span>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-[#141622] rounded-2xl border border-[#26293D] overflow-hidden shadow-xs animate-pulse"
                  >
                    <div className="h-44 bg-[#1A1D2B]"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-[#1A1D2B] rounded w-1/3"></div>
                      <div className="h-5 bg-[#1A1D2B] rounded w-3/4"></div>
                      <div className="h-4 bg-[#1A1D2B] rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error View */}
            {error && (
              <div className="p-6 rounded-2xl bg-[#1A1318] border border-[#3E1D27] text-rose-300 text-center">
                <p className="font-semibold text-sm">{error}</p>
                <button
                  onClick={fetchListings}
                  className="mt-3 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && listings.length === 0 && (
              <div className="bg-[#141622] rounded-2xl border border-[#26293D] p-12 text-center shadow-md max-w-md mx-auto my-6">
                <div className="w-14 h-14 rounded-2xl bg-[#181A26] text-[#A78BFA] flex items-center justify-center mx-auto mb-3 border border-[#2D3147] shadow-inner">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">No matching items found</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {hasActiveFilters
                    ? 'No items matched all your active search and price criteria. Try relaxing your filters or searching a different term.'
                    : 'There are currently no items listed for rent. Be the first on campus to post!'}
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  {hasActiveFilters ? (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 rounded-xl border border-[#26293D] text-xs font-semibold text-slate-300 hover:bg-[#181A28] hover:text-white cursor-pointer transition-colors"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <Link
                      to="/listings/new"
                      className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-colors"
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
                {listings.map((item, idx) => {
                  const isRecentlyUpdated = recentlyUpdatedListingId === item._id;
                  const staggerDelay = `${Math.min(idx * 30, 210)}ms`;

                  return (
                    <Link
                      key={item._id}
                      to={`/listings/${item._id}`}
                      style={{ animationDelay: staggerDelay }}
                      className="group bg-[#141622] rounded-2xl border border-[#26293D] hover:border-[#8B5CF6]/50 hover:shadow-[0_0_24px_rgba(139,92,246,0.18)] card-hover-lift animate-card-reflow flex flex-col justify-between overflow-hidden transition-all duration-200"
                    >
                      {/* Shared Fixed-Aspect-Ratio Listing Image */}
                      <ListingImage
                        images={item.images}
                        imageUrl={item.imageUrl}
                        category={item.category}
                        title={item.title}
                        aspectRatio="h-44"
                      >
                        {/* Category Tag Overlay (Subtle pill badge consistent with hero verified pill) */}
                        <div className="absolute top-3 left-3">
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-inner ${getCategoryBadgeColor(
                              item.category
                            )}`}
                          >
                            {item.category}
                          </span>
                        </div>

                        {/* Availability Status Pill (Purple accent for Available status) */}
                        <div className="absolute top-3 right-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-xs pill-status-transition ${
                              isRecentlyUpdated ? 'animate-status-update ring-2 ring-[#8B5CF6] ring-offset-1 ring-offset-[#0D0E15]' : ''
                            } ${
                              item.isAvailable
                                ? 'bg-[#181A26]/95 text-[#C4B5FD] border-[#8B5CF6]/40'
                                : 'bg-[#0D0E15]/90 text-slate-400 border-[#26293D]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                item.isAvailable ? 'bg-[#8B5CF6] animate-pulse' : 'bg-slate-500'
                              }`}
                            />
                            {item.isAvailable ? 'Available' : 'Rented'}
                          </span>
                        </div>
                      </ListingImage>

                      {/* Card Content Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Condition & Campus Tag */}
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span className="capitalize font-semibold text-slate-400 text-[11px]">
                              {item.condition?.replace('_', ' ')}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 truncate max-w-[120px]">
                              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                              {item.location || item.campus || 'NIT Durgapur'}
                            </span>
                          </div>

                          {/* Item Title */}
                          <h3 className="font-bold text-white text-sm group-hover:text-[#C4B5FD] transition-colors line-clamp-1">
                            {item.title}
                          </h3>

                          {/* Item Description */}
                          <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed font-normal">
                            {item.description}
                          </p>
                        </div>

                        {/* Card Bottom Row: Bold Price (Purple Accent) & Lister Info */}
                        <div className="mt-4 pt-3 border-t border-[#1F2233] flex items-center justify-between">
                          <div className="flex items-baseline">
                            <span className="text-base sm:text-lg font-black text-[#A78BFA] tracking-tight">
                              ₹{item.pricePerDay}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium ml-1">/ day</span>
                          </div>

                          {/* Lister Verified Student Pill */}
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#181A26] border border-[#2D3147] text-[#C4B5FD] text-[10px] font-extrabold flex items-center justify-center">
                              {(item.owner?.name || 'S')[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-slate-300 truncate max-w-[80px]">
                              {item.owner?.name?.split(' ')[0] || 'Student'}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#A78BFA] flex-shrink-0" />
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
                  className="px-3.5 py-2 rounded-xl border border-[#26293D] bg-[#141622] text-xs font-semibold text-slate-300 hover:bg-[#181A28] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-bold text-slate-400 px-3">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-2 rounded-xl border border-[#26293D] bg-[#141622] text-xs font-semibold text-slate-300 hover:bg-[#181A28] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
  );
};

export default Marketplace;
