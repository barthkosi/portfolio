// ========================================
// UTILITY FUNCTIONS
// ========================================
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
// SIMPLIFIED ANIMATION CONTROLLER
// ========================================
class AnimationController {
  constructor(selector) {
    this.items = document.querySelectorAll(selector);
    this.observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px', // Trigger slightly before bottom
      threshold: 0.1
    };
    this.init();
  }

  init() {
    // 1. Set Initial State
    // We do this in JS to ensure if JS fails, CSS might still show content (if setup that way)
    // or simply to prepare the animation start values.
    this.items.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
      item.dataset.index = index; // Keep track of original order
    });

    // 2. Create the Observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateItem(entry.target);
          observer.unobserve(entry.target); // Run once then stop watching
        }
      });
    }, this.observerOptions);

    // 3. Start Observing
    this.items.forEach(item => observer.observe(item));
  }

  animateItem(item) {
    // Calculate a dynamic delay based on the item's visual position
    // This creates a "wave" effect for items currently on screen
    // We use a simple modulo to reset delay for long scrolling lists
    // so user doesn't wait 10 seconds for the 100th item.
    
    // We try to find how many items are currently visible to stagger them relative to each other
    const index = parseInt(item.dataset.index || 0);
    const delayStep = 100; // ms
    
    // Simple stagger logic: 
    // If multiple items trigger at once, they will naturally have different indices.
    // We cap the stagger at 5 items (500ms) to prevent long delays.
    const staggerIndex = index % 5; 
    const delay = staggerIndex * delayStep;

    setTimeout(() => {
      requestAnimationFrame(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
        item.classList.add('loaded');
      });
    }, delay);
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
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }
  
  setup() {
    // 1. Initialize Smooth Scroll
    this.smoothScroll = new SmoothScroll();
    
    // 2. Initialize Analytics
    this.analytics = new AnalyticsTracker();

    // 3. Initialize Animations
    // We target the CONTAINER (.portfolio-item), not the image. 
    // This ensures the layout is animated even if the image is still loading.
    this.animator = new AnimationController('.portfolio-item');
    
    // Add global loaded class for any CSS that depends on it
    document.body.classList.add('loaded');
  }
}

// ========================================
// START
// ========================================
const app = new PortfolioApp();