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
    this.images = document.querySelectorAll(selector);
    this.loadedCount = 0;
    this.totalImages = this.images.length;
    this.init();
  }
  
  init() {
    this.images.forEach((img, index) => {
      this.setupImage(img, index);
    });
  }
  
  setupImage(img, index) {
        // Set initial state
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
    
    // Add index for staggered animation
    img.dataset.index = index;
    
    // Event listeners
    img.addEventListener('load', () => this.handleLoad(img));
    img.addEventListener('error', () => this.handleError(img));
  }
  
  handleLoad(img) {
    img.classList.add('loaded');
    img.style.opacity = '1';
    this.loadedCount++;
    
    // Add staggered animation delay
    const index = parseInt(img.dataset.index);
    img.style.animationDelay = `${index * 0.1}s`;
  }
  
  handleError(img) {
    console.warn('Failed to load image:', img.src);
    
    // Retry loading after a short delay
    setTimeout(() => {
      const originalSrc = img.src;
      img.src = '';
      img.src = originalSrc;
    }, 1000);
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
    this.scrollAnimations = new ScrollAnimations();
    this.smoothScroll = new SmoothScroll();
    
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
