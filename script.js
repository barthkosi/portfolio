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
// ROBUST IMAGE LOADER CLASS (FIXED)
// ========================================
class ImageLoader {
  constructor(selector) {
    this.selector = selector;
    // Queue system
    this.queuedItems = [];
    this.isAnimating = false;
    this.triggeredIndices = new Set();
    
    // Configuration
    this.staggerDelay = 200; // Time between items appearing (ms)
    this.safetyTimeout = 2500; // Max time to wait for an image (ms)
    
    this.init();
  }
  
  init() {
    this.images = Array.from(document.querySelectorAll(this.selector));
    
    // 1. Setup Initial State (Hidden)
    this.images.forEach((img, index) => {
      const item = img.closest('.portfolio-item');
      if (item) {
        // Force initial hidden state via inline styles to override any CSS issues
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'none'; // Prevent transition on page load
        
        // Store metadata
        item.dataset.index = index;
        item.dataset.status = 'pending';
      }
    });

    // 2. Setup Observer to trigger the queue
    this.setupObserver();
  }
  
  setupObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const item = entry.target;
          const index = parseInt(item.dataset.index);
          
          // If not already triggered, add to queue
          if (!this.triggeredIndices.has(index)) {
            this.triggeredIndices.add(index);
            this.addToQueue(item, index);
            observer.unobserve(item); // Stop watching this item
          }
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px', // Trigger when item is 50px from entering
      threshold: 0.01
    });

    // Observe all items
    this.images.forEach(img => {
      const item = img.closest('.portfolio-item');
      if (item) observer.observe(item);
    });
  }

  addToQueue(item, index) {
    const img = item.querySelector('.portfolio-image');
    
    this.queuedItems.push({ item, img, index });
    
    // Sort queue by index to ensure top-to-bottom flow even if triggered randomly
    this.queuedItems.sort((a, b) => a.index - b.index);
    
    if (!this.isAnimating) {
      this.processQueue();
    }
  }

  processQueue() {
    // Stop if queue is empty
    if (this.queuedItems.length === 0) {
      this.isAnimating = false;
      return;
    }

    this.isAnimating = true;
    const { item, img } = this.queuedItems.shift();

    // The function that actually reveals the item
    const revealItem = () => {
      // Add transitions
      item.style.transition = 'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)';
      
      // Trigger animation frame to ensure styles apply
      requestAnimationFrame(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
        item.classList.add('loaded');
      });

      // Move to next item after a short delay (stagger effect)
      setTimeout(() => {
        this.processQueue();
      }, this.staggerDelay);
    };

    // === THE FIX: ROBUST LOAD CHECK ===
    
    // A flag to ensure we don't reveal twice
    let isRevealed = false;
    const safeReveal = () => {
      if (isRevealed) return;
      isRevealed = true;
      revealItem();
    };

    // 1. If image is missing or already loaded, reveal immediately
    if (!img || (img.complete && img.naturalHeight > 0)) {
      safeReveal();
      return;
    }

    // 2. Listen for load or error
    img.addEventListener('load', safeReveal, { once: true });
    img.addEventListener('error', safeReveal, { once: true }); // Show even if broken

    // 3. SAFETY VALVE: Force reveal if browser hangs for too long
    // This fixes the "deadlock" on live sites
    setTimeout(safeReveal, this.safetyTimeout);
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
// ANALYTICS TRACKING
// ========================================
class AnalyticsTracker {
  constructor() {
    this.init();
  }
  
  init() {
    this.trackCTA();
    this.trackPortfolioViews();
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
          // Only track once
          imageObserver.unobserve(entry.target);
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
}

// ========================================
// MAIN APPLICATION
// ========================================
class PortfolioApp {
  constructor() {
    this.init();
  }
  
  init() {
    // Robust DOM check
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      // If already loaded, run immediately
      this.setup();
    }
  }
  
  setup() {
    // 1. Initialize Smooth Scroll
    this.smoothScroll = new SmoothScroll();
    
    // 2. Initialize Analytics
    this.analytics = new AnalyticsTracker();

    // 3. Initialize Image Loader (Last to ensure layout is ready)
    // We pass the selector for the images
    this.imageLoader = new ImageLoader('.portfolio-image');
    
    // Add global loaded class
    document.body.classList.add('loaded');
  }
}

// ========================================
// START
// ========================================
const app = new PortfolioApp();