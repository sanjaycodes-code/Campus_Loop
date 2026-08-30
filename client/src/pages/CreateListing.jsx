import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Laptop,
  BookOpen,
  Headphones,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  DollarSign,
  MapPin,
  Building,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const CreateListing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'device',
    pricePerDay: '',
    securityDeposit: '0',
    condition: 'good',
    campus: user?.campus || 'NIT Durgapur',
    location: '',
  });

  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    title,
    description,
    category,
    pricePerDay,
    securityDeposit,
    condition,
    campus,
    location,
  } = formData;

  const handleChange = (e) => {
    if (errorMessage) setErrorMessage('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddImage = (e) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      setErrorMessage('Image URL must start with http:// or https://');
      return;
    }

    if (images.length >= 5) {
      setErrorMessage('You can add up to 5 images per listing.');
      return;
    }

    setImages([...images, imageUrl.trim()]);
    setImageUrl('');
    setErrorMessage('');
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > 5) {
      setErrorMessage('You can add up to 5 images per listing.');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size should be under 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target.result]);
          setErrorMessage('');
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !category || pricePerDay === '') {
      setErrorMessage('Please fill in all required fields (title, description, category, daily price).');
      return;
    }

    if (Number(pricePerDay) < 0) {
      setErrorMessage('Daily rental rate cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Automatically include uncommitted imageUrl from the input field if valid
    let finalImages = [...images];
    if (imageUrl.trim() && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      if (!finalImages.includes(imageUrl.trim())) {
        finalImages.push(imageUrl.trim());
      }
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        pricePerDay: Number(pricePerDay),
        securityDeposit: Number(securityDeposit || 0),
        condition,
        campus: campus.trim(),
        location: location.trim(),
        images: finalImages,
        isAvailable: true,
      };

      const res = await api.post('/listings', payload);

      if (res.data.success && res.data.listing) {
        navigate(`/listings/${res.data.listing._id}`);
      }
    } catch (err) {
      console.error('Failed to create listing:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to create listing. Please check your connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Header Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/marketplace"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
          >
            &larr; Back to Marketplace
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Post an Item for Rent
          </h1>
          <p className="text-sm text-slate-500">
            Make your books, calculators, lab gear, or devices available to fellow NIT Durgapur students.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to publish listing</p>
              <p className="mt-0.5 text-xs text-rose-600">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Category Selection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              1. Select Category <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'device',
                  label: 'Device',
                  desc: 'Laptops, tablets, displays, iPads',
                  icon: Laptop,
                },
                {
                  id: 'book',
                  label: 'Book',
                  desc: 'Textbooks, lab manuals, semester notes',
                  icon: BookOpen,
                },
                {
                  id: 'gadget',
                  label: 'Gadget / Tool',
                  desc: 'Scientific calculators, headphones, Arduino',
                  icon: Headphones,
                },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => {}}
                        className="text-sky-600"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{cat.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Basic Item Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Item Details
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Listing Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={title}
                onChange={handleChange}
                placeholder="e.g. Casio fx-991EX ClassWiz Scientific Calculator"
                required
                maxLength={120}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="description"
                value={description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe condition, what is included (cables, cover), rules or course usage..."
                required
                maxLength={2000}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              ></textarea>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condition
              </label>
              <select
                name="condition"
                value={condition}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value="brand_new">Brand New (Unused with packaging)</option>
                <option value="like_new">Like New (Mint condition, barely used)</option>
                <option value="good">Good (Fully functional, light cosmetics)</option>
                <option value="fair">Fair (Visible wear but works normally)</option>
              </select>
            </div>
          </div>

          {/* Card 3: Pricing & Deposit */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              3. Rental Rates
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price Per Day (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="pricePerDay"
                    value={pricePerDay}
                    onChange={handleChange}
                    placeholder="e.g. 25"
                    min="0"
                    step="1"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Suggested: ₹15 - ₹100/day depending on item</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Refundable Security Deposit (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="securityDeposit"
                    value={securityDeposit}
                    onChange={handleChange}
                    placeholder="e.g. 200"
                    min="0"
                    step="1"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Returned to renter upon safe return</p>
              </div>
            </div>
          </div>

          {/* Card 4: Photos & Images */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Photos & Images (Up to 5)
              </h2>
              <span className="text-xs text-slate-500 font-medium">{images.length}/5 added</span>
            </div>

            {/* Upload Options: File Picker & URL input */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Option A: Direct File Upload from Phone / PC */}
              <label className="sm:col-span-5 flex flex-col items-center justify-center p-4 border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-50 rounded-2xl cursor-pointer transition-all text-center group">
                <Upload className="w-6 h-6 text-sky-600 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-xs font-bold text-slate-800">Upload from Device</span>
                <span className="text-[11px] text-slate-500">JPG, PNG, WebP up to 5MB</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Option B: Web URL Input */}
              <div className="sm:col-span-7 flex flex-col justify-center space-y-2">
                <span className="text-[11px] font-semibold text-slate-600">Or paste an Image Web URL:</span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Quick Sample Photos */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
                  <span className="text-slate-400 text-[10px] font-semibold">1-Click Samples:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setImages([
                        ...images,
                        'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80',
                      ])
                    }
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    💻 Laptop
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImages([
                        ...images,
                        'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&auto=format&fit=crop&q=80',
                      ])
                    }
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    🔢 Calculator
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImages([
                        ...images,
                        'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?w=800&auto=format&fit=crop&q=80',
                      ])
                    }
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    📚 Textbook
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImages([
                        ...images,
                        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
                      ])
                    }
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    🎧 Headphones
                  </button>
                </div>
              </div>
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video flex items-center justify-center"
                  >
                    <img
                      src={img}
                      alt={`Preview ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div
                      style={{ display: 'none' }}
                      className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-2 text-center text-slate-400 text-[10px]"
                    >
                      <ImageIcon className="w-5 h-5 mb-1 text-slate-300" />
                      <span>Image Preview Unavailable</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer z-10"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No images added yet. Upload from your device, paste a direct image URL, or pick a sample photo.
              </p>
            )}
          </div>

          {/* Card 5: Campus & Location */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              5. Pickup Location on Campus
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus
                </label>
                <input
                  type="text"
                  name="campus"
                  value={campus}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pickup Landmark / Hostel
                </label>
                <input
                  type="text"
                  name="location"
                  value={location}
                  onChange={handleChange}
                  placeholder="e.g. Hall 7 / Central Library Lobby"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              to="/marketplace"
              className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-sky-600/20 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <span>Publish Rental Listing</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateListing;
