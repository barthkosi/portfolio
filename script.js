// ========================================
// UTILITY FUNCTIONS
// ========================================
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// ========================================
// IMAGE LOADER CLASS
// ========================================
class ImageLoader {
  constructor(selector) {
    this.images = Array.from(document.querySelectorAll(selector));
    this.loadedCount = 0;
    this.totalImages = this.images.length;
    this.animationDuration = 800; // Duration of fade-in animation in ms
    this.triggerDistance = 100; // Distance from viewport bottom to trigger (in px)
    this.queuedItems = []; // Queue of items waiting to animate
    this.isAnimating = false; // Track if currently animating
    this.triggeredItems = new Set(); // Track which items have been triggered
    this.init();
  }
  
  init() {
    // Set up all images with initial hidden state
    this.images.forEach((img, index) => {
      this.setupImage(img, index);
    });
    
    // Trigger first two images if they're already in viewport on page load
    this.triggerInitialImages();
    
    // Set up IntersectionObserver to trigger when items are 100px from viewport bottom
    this.setupObserver();
  }
  
  triggerInitialImages() {
    // Check and trigger first two images if they're already visible
    const initialCount = Math.min(2, this.totalImages);
    
    for (let i = 0; i < initialCount; i++) {
      const img = this.images[i];
      const portfolioItem = img.closest('.portfolio-item');
      
      if (portfolioItem && portfolioItem.dataset.triggered === 'false') {
        const rect = portfolioItem.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check if item is already in viewport (top is above viewport bottom)
        const isInViewport = rect.top < viewportHeight && rect.bottom > 0;
        
        if (isInViewport) {
          portfolioItem.dataset.triggered = 'true';
          this.triggeredItems.add(i);
          this.queueItem(portfolioItem, i);
        }
      }
    }
  }
  
  setupImage(img, index) {
    const portfolioItem = img.closest('.portfolio-item');
    
    // Set initial hidden state with transform from bottom
    portfolioItem.style.opacity = '0';
    portfolioItem.style.transform = 'translateY(30px)';
    portfolioItem.style.transition = 'none'; // No transition initially
    
    // Store index
    portfolioItem.dataset.index = index;
    img.dataset.index = index;
    portfolioItem.dataset.triggered = 'false';
    
    // Initially hide the image
    img.style.opacity = '0';
  }
  
  setupObserver() {
    // IntersectionObserver with no rootMargin - we'll check distance manually
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: [0, 0.01, 0.1, 0.5, 1.0]
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const portfolioItem = entry.target;
        const index = parseInt(portfolioItem.dataset.index);
        
        // Only trigger if not already triggered
        if (portfolioItem.dataset.triggered === 'false') {
          // Check if item is within 100px of viewport bottom
          if (this.isWithinTriggerDistance(portfolioItem)) {
            portfolioItem.dataset.triggered = 'true';
            this.triggeredItems.add(index);
            this.queueItem(portfolioItem, index);
          }
        }
      });
    }, observerOptions);
    
    // Observe all portfolio items
    this.images.forEach(img => {
      const portfolioItem = img.closest('.portfolio-item');
      if (portfolioItem) {
        this.observer.observe(portfolioItem);
      }
    });
    
    // Also check on scroll for items that might have been missed
    this.setupScrollCheck();
  }
  
  isWithinTriggerDistance(portfolioItem) {
    const rect = portfolioItem.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const itemTop = rect.top;
    const itemBottom = rect.bottom;
    
    // Calculate the trigger zone: from (viewportHeight - 100px) to viewportHeight
    const triggerZoneTop = viewportHeight - this.triggerDistance;
    const triggerZoneBottom = viewportHeight;
    
    // Only trigger if the item's top edge is within the trigger zone
    // AND the item hasn't fully scrolled past the viewport top
    const isInTriggerZone = itemTop >= triggerZoneTop && itemTop <= triggerZoneBottom;
    const isNotFullyPast = itemBottom > 0; // Item hasn't fully scrolled past the top
    
    return isInTriggerZone && isNotFullyPast;
  }
  
  setupScrollCheck() {
    // Throttled scroll check to catch items that might have been missed
    const checkVisibleItems = throttle(() => {
      this.images.forEach((img, index) => {
        const portfolioItem = img.closest('.portfolio-item');
        if (portfolioItem && portfolioItem.dataset.triggered === 'false') {
          const rect = portfolioItem.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // Only check items that are near the viewport (within 200px above or below)
          // This prevents checking items that are far away
          if (rect.top < viewportHeight + 200 && rect.bottom > -200) {
            if (this.isWithinTriggerDistance(portfolioItem)) {
              portfolioItem.dataset.triggered = 'true';
              this.triggeredItems.add(index);
              this.queueItem(portfolioItem, index);
            }
          }
        }
      });
    }, 100);
    
    window.addEventListener('scroll', checkVisibleItems, { passive: true });
    
    // Initial check only for items near viewport
    setTimeout(checkVisibleItems, 100);
  }
  
  queueItem(portfolioItem, index) {
    const img = this.images[index];
    if (!img) return;
    
    // Add to queue
    this.queuedItems.push({ portfolioItem, img, index });
    
    // Sort queue by index to maintain order
    this.queuedItems.sort((a, b) => a.index - b.index);
    
    // Start processing queue if not already animating
    if (!this.isAnimating) {
      this.processQueue();
    }
  }
  
  processQueue() {
    if (this.queuedItems.length === 0) {
      this.isAnimating = false;
      return;
    }
    
    this.isAnimating = true;
    const { portfolioItem, img, index } = this.queuedItems.shift();
    
    // Set up load event listener
    const handleLoad = () => {
      this.handleImageLoaded(img, portfolioItem, index);
    };
    
    // If image is already loaded (cached), trigger after small delay
    if (img.complete && img.naturalHeight !== 0) {
      setTimeout(() => {
        handleLoad();
      }, 50);
    } else {
      // Wait for image to load
      img.addEventListener('load', handleLoad, { once: true });
      img.addEventListener('error', () => {
        // Even on error, show the item
        this.handleImageLoaded(img, portfolioItem, index);
      }, { once: true });
    }
  }
  
  handleImageLoaded(img, portfolioItem, index) {
    // Add transition for smooth animation
    portfolioItem.style.transition = `opacity ${this.animationDuration}ms ease-out, transform ${this.animationDuration}ms ease-out`;
    
    // Trigger fade-in from bottom animation
    requestAnimationFrame(() => {
      portfolioItem.style.opacity = '1';
      portfolioItem.style.transform = 'translateY(0)';
    });
    
    // Show the image
    img.style.opacity = '1';
    img.style.transition = `opacity ${this.animationDuration}ms ease-out`;
    
    // Mark as loaded
    portfolioItem.classList.add('loaded');
    img.classList.add('loaded');
    
    this.loadedCount++;
    
    // Wait for animation to complete before processing next item in queue
    setTimeout(() => {
      this.processQueue();
    }, this.animationDuration);
  }
  
  handleError(img) {
    console.warn('Failed to load image:', img.src);
    const portfolioItem = img.closest('.portfolio-item');
    const index = parseInt(portfolioItem?.dataset.index);
    
    // Still show the item even if image fails
    if (portfolioItem && index !== undefined) {
      this.handleImageLoaded(img, portfolioItem, index);
    }
  }
}

// ========================================
// SCROLL ANIMATIONS
// ========================================
class ScrollAnimations {
  constructor() {
    this.observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      this.observerOptions
    );
    
    this.init();
  }
  
  init() {
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    portfolioItems.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      item.dataset.index = index;
      
      this.observer.observe(item);
    });
  }
  
  handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
        const index = parseInt(entry.target.dataset.index);
        entry.target.style.animationDelay = `${index * 0.1}s`;
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
        
        // Unobserve after animation
        this.observer.unobserve(entry.target);
      }
    });
  }
}

// ========================================
// SMOOTH SCROLLING
// ========================================
class SmoothScroll {
  constructor() {
    this.init();
  }
  
  init() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', this.handleAnchorClick.bind(this));
    });
  }
  
  handleAnchorClick(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
}

// ========================================
// PERFORMANCE MONITORING
// ========================================
class PerformanceMonitor {
  constructor() {
    this.init();
  }
  
  init() {
    // Monitor Core Web Vitals
    this.measureLCP();
    this.measureFID();
    this.measureCLS();
  }
  
  measureLCP() {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }
  
  measureFID() {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        console.log('FID:', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });
  }
  
  measureCLS() {
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      console.log('CLS:', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

// ========================================
// ANALYTICS TRACKING
// ========================================
class AnalyticsTracker {
  constructor() {
    this.init();
  }
  
  init() {
    // Track CTA button clicks
    this.trackCTA();
    // Track portfolio image views
    this.trackPortfolioViews();
    // Track scroll depth
    this.trackScrollDepth();
  }
  
  trackCTA() {
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton && typeof gtag !== 'undefined') {
      ctaButton.addEventListener('click', () => {
        gtag('event', 'cta_click', {
          'event_category': 'engagement',
          'event_label': 'book_intro_call',
          'value': 1
        });
      });
    }
  }
  
  trackPortfolioViews() {
    const portfolioImages = document.querySelectorAll('.portfolio-image');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && typeof gtag !== 'undefined') {
          gtag('event', 'portfolio_image_view', {
            'event_category': 'engagement',
            'event_label': entry.target.alt || 'portfolio_image',
            'value': 1
          });
        }
      });
    }, { threshold: 0.5 });
    
    portfolioImages.forEach(img => imageObserver.observe(img));
  }
  
  trackScrollDepth() {
    let maxScroll = 0;
    const scrollDepthThresholds = [25, 50, 75, 90, 100];
    const trackedDepths = new Set();
    
    const trackScrollDepth = throttle(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        scrollDepthThresholds.forEach(threshold => {
          if (scrollPercent >= threshold && !trackedDepths.has(threshold) && typeof gtag !== 'undefined') {
            trackedDepths.add(threshold);
            gtag('event', 'scroll_depth', {
              'event_category': 'engagement',
              'event_label': `${threshold}%`,
              'value': threshold
            });
          }
        });
      }
    }, 100);
    
    window.addEventListener('scroll', trackScrollDepth);
  }
}

// ========================================
// MAIN APPLICATION
// ========================================
class PortfolioApp {
  constructor() {
    this.init();
  }
  
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    // Initialize components
    this.imageLoader = new ImageLoader('.portfolio-image');
    // ScrollAnimations disabled - using sequential image loading instead
    // this.scrollAnimations = new ScrollAnimations();
    this.smoothScroll = new SmoothScroll();
    this.analytics = new AnalyticsTracker();
    
    // Initialize performance monitoring in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.performanceMonitor = new PerformanceMonitor();
    }
    
    // Add loaded class to body
    window.addEventListener('load', () => {
      document.body.classList.add('loaded');
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
  
  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, pause animations if needed
      document.body.classList.add('page-hidden');
    } else {
      // Page is visible, resume animations
      document.body.classList.remove('page-hidden');
    }
  }
}

// ========================================
// INITIALIZE APPLICATION
// ========================================
const app = new PortfolioApp();
