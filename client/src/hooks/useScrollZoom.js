import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger once globally
gsap.registerPlugin(ScrollTrigger);

/**
 * Reusable Hook for Scroll-Scrubbed Hero Zoom with GSAP + ScrollTrigger
 *
 * @param {Object} options Configuration parameters
 * @param {number} options.zoomScale Target scale for the visual (e.g. 1.2 = 20% zoom)
 * @param {number} options.textParallaxY Upward pixel parallax for text (e.g. -30)
 * @param {number} options.textFade Target opacity for text (e.g. 0.8)
 * @param {string} options.start ScrollTrigger start point (default: 'top top')
 * @param {string} options.end ScrollTrigger end point (default: 'bottom top')
 * @param {number|boolean} options.scrub Scrub smoothing duration in seconds (default: 1)
 */
export const useScrollZoom = ({
  zoomScale = 1.2,
  textParallaxY = -30,
  textFade = 0.8,
  start = 'top top',
  end = 'bottom top',
  scrub = 1,
} = {}) => {
  const containerRef = useRef(null);
  const visualRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const visual = visualRef.current;
    const text = textRef.current;

    if (!container) return;

    // Accessibility check: Do not animate if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return;
    }

    // GSAP Context ensures 100% clean teardown on route change / page unmount
    const ctx = gsap.context(() => {
      // 1. GPU-Accelerated Scrubbed Zoom on Visual Target
      if (visual) {
        gsap.fromTo(
          visual,
          { scale: 1, transformOrigin: 'center center', willChange: 'transform' },
          {
            scale: zoomScale,
            ease: 'none',
            scrollTrigger: {
              trigger: container,
              start: start,
              end: end,
              scrub: scrub,
              invalidateOnRefresh: true,
            },
          }
        );
      }

      // 2. Subtle Upward Parallax & Fade on Text Target
      if (text) {
        gsap.fromTo(
          text,
          { y: 0, opacity: 1, willChange: 'transform, opacity' },
          {
            y: textParallaxY,
            opacity: textFade,
            ease: 'none',
            scrollTrigger: {
              trigger: container,
              start: start,
              end: end,
              scrub: scrub,
              invalidateOnRefresh: true,
            },
          }
        );
      }
    }, containerRef);

    // Teardown: Kills all created ScrollTrigger instances to prevent memory leaks
    return () => {
      ctx.revert();
    };
  }, [zoomScale, textParallaxY, textFade, start, end, scrub]);

  return { containerRef, visualRef, textRef };
};

export default useScrollZoom;
