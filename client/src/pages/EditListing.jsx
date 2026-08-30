import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Save,
} from 'lucide-react';

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'device',
    pricePerDay: '',
    securityDeposit: '0',
    condition: 'good',
    campus: 'NIT Durgapur',
    location: '',
    isAvailable: true,
  });

  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    title,
    description,
    category,
    pricePerDay,
    securityDeposit,
    condition,
    campus,
    location,
    isAvailable,
  } = formData;

  useEffect(() => {
    const fetchListing = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/listings/${id}`);
        if (res.data.success && res.data.listing) {
          const l = res.data.listing;

          // Guard: Verify ownership in UI (backend will also enforce on PUT)
          const ownerId = l.owner?._id || l.owner;
          if (user && ownerId && ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
            navigate(`/listings/${id}`, { replace: true });
            return;
          }

          setFormData({
            title: l.title || '',
            description: l.description || '',
            category: l.category || 'device',
            pricePerDay: l.pricePerDay || '',
            securityDeposit: l.securityDeposit || '0',
            condition: l.condition || 'good',
            campus: l.campus || 'NIT Durgapur',
            location: l.location || '',
            isAvailable: l.isAvailable !== undefined ? l.isAvailable : true,
          });
          setImages(l.images || []);
        }
      } catch (err) {
        console.error('Failed to load listing for editing:', err);
        setErrorMessage(err.response?.data?.message || 'Could not load listing.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [id, user, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (errorMessage) setErrorMessage('');
    if (successMessage) setSuccessMessage('');

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
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
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

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
        isAvailable: Boolean(isAvailable),
      };

      const res = await api.put(`/listings/${id}`, payload);

      if (res.data.success) {
        setSuccessMessage('Listing updated successfully!');
        setTimeout(() => {
          navigate(`/listings/${id}`);
        }, 800);
      }
    } catch (err) {
      console.error('Failed to update listing:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to update listing. Ownership validation error.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full flex-1 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <div className="mb-6">
          <Link
            to={`/listings/${id}`}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel & Return to Listing</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Edit Listing
          </h1>
          <p className="text-sm text-slate-500">
            Update pricing, description, availability, and photos.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Update Failed</p>
              <p className="mt-0.5 text-xs text-rose-600">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Availability Toggle Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Listing Availability Status</h3>
              <p className="text-xs text-slate-500">
                Mark as unavailable if the item is currently rented out or under repair.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isAvailable"
                checked={isAvailable}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {/* Category */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'device', label: 'Device', icon: Laptop },
                { id: 'book', label: 'Book', icon: BookOpen },
                { id: 'gadget', label: 'Gadget / Tool', icon: Headphones },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-sky-600' : 'text-slate-500'}`} />
                    <span className="font-bold text-sm text-slate-900">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Item Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={title}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="description"
                value={description}
                onChange={handleChange}
                rows={4}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              ></textarea>
            </div>

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
                <option value="brand_new">Brand New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              Pricing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price Per Day (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="pricePerDay"
                  value={pricePerDay}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Security Deposit (₹)
                </label>
                <input
                  type="number"
                  name="securityDeposit"
                  value={securityDeposit}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Photos & Images (Up to 5)
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              to={`/listings/${id}`}
              className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-sky-600/20 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EditListing;
