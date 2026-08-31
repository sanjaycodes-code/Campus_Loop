import React, { useState } from 'react';
import { BookOpen, Laptop, Headphones, Tag } from 'lucide-react';

/**
 * Shared ListingImage component with fixed aspect ratio,
 * graceful fallback handling, and intentional category-themed placeholders.
 *
 * @param {Object} props
 * @param {Array<string>} [props.images] Array of image URLs
 * @param {string} [props.imageUrl] Single image URL fallback
 * @param {string} [props.image] Single image fallback
 * @param {string} [props.category='device'] Category type ('device'|'book'|'gadget')
 * @param {string} [props.title='Item'] Title for alt text
 * @param {string} [props.aspectRatio='h-44'] Height/aspect ratio class
 * @param {string} [props.className=''] Additional wrapper styling
 * @param {boolean} [props.hoverZoom=true] Enable hover scale on images
 * @param {React.ReactNode} [props.children] Absolute badge/pill overlays
 * @param {React.Ref} [props.innerRef] Optional GSAP visual target ref
 */
const ListingImage = ({
  images = [],
  imageUrl = '',
  image = '',
  category = 'device',
  title = 'Listing image',
  aspectRatio = 'h-44',
  className = '',
  hoverZoom = true,
  children,
  innerRef,
}) => {
  const [hasError, setHasError] = useState(false);

  // Extract first valid image string
  const primaryImage =
    (Array.isArray(images) && images.length > 0 ? images[0] : null) ||
    imageUrl ||
    image ||
    null;

  const normalizedCategory = (category || 'device').toLowerCase();

  // Category thematic styles
  const getCategoryConfig = (cat) => {
    switch (cat) {
      case 'book':
        return {
          bgGradient: 'bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-100/60',
          borderColor: 'border-amber-200/60',
          textColor: 'text-amber-700',
          badgeText: 'Academic Text',
          Icon: BookOpen,
        };
      case 'gadget':
        return {
          bgGradient: 'bg-gradient-to-br from-violet-50 via-purple-50/60 to-violet-100/50',
          borderColor: 'border-violet-200/60',
          textColor: 'text-violet-600',
          badgeText: 'Campus Gadget',
          Icon: Headphones,
        };
      case 'device':
      default:
        return {
          bgGradient: 'bg-gradient-to-br from-indigo-50 via-sky-50/60 to-indigo-100/50',
          borderColor: 'border-indigo-200/60',
          textColor: 'text-indigo-600',
          badgeText: 'Hardware Gear',
          Icon: Laptop,
        };
    }
  };

  const config = getCategoryConfig(normalizedCategory);
  const PlaceholderIcon = config.Icon;

  return (
    <div
      className={`relative w-full overflow-hidden flex items-center justify-center bg-slate-100 ${aspectRatio} ${className}`}
    >
      {primaryImage && !hasError ? (
        <div ref={innerRef} className="w-full h-full flex items-center justify-center origin-center">
          <img
            src={primaryImage}
            alt={title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-transform duration-300 ${
              hoverZoom ? 'group-hover:scale-105' : ''
            }`}
            onError={() => setHasError(true)}
          />
        </div>
      ) : (
        /* Intentional Category-Themed Designed Placeholder */
        <div
          ref={innerRef}
          className={`w-full h-full flex flex-col items-center justify-center relative origin-center ${config.bgGradient}`}
        >
          <div
            className={`w-14 h-14 rounded-2xl bg-white shadow-xs border ${config.borderColor} flex items-center justify-center text-slate-700 transition-transform ${
              hoverZoom ? 'group-hover:scale-105' : ''
            }`}
          >
            <PlaceholderIcon className={`w-7 h-7 ${config.textColor}`} />
          </div>
          <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {config.badgeText}
          </span>
        </div>
      )}

      {/* Badges, overlays, and status pills */}
      {children}
    </div>
  );
};

export default ListingImage;
