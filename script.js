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
// DATA
// ========================================
const PORTFOLIO_ITEMS = [
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto,fl_immutable_cache/v1756281622/bookworms_f3dtzz.png",
        alt: "Bookworms project showcase",
        width: 1920,
        height: 1080
    },
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto/v1756360174/bookworm_-_cover_kc0pcr.png",
        alt: "Bookworm cover design",
        width: 1920,
        height: 1080
    },
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto/v1756281199/bookworm_-_logo_cover_lftbmz.png",
        alt: "Bookworm logo and cover design",
        width: 1920,
        height: 1080
    },
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto/v1756360899/atoms_-_1_hawwrh.png",
        alt: "Atoms design system part 1"
    },
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto/v1756360900/atoms_-_2_nu2b6z.png",
        alt: "Atoms design system part 2"
    },
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto/v1756360901/atoms_-_3_memhte.png",
        alt: "Atoms design system part 3"
    },
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto/v1756281200/polarcam_bmcbvy.png",
        alt: "Polarcam project showcase"
    },
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto/v1756359979/file_cover_-_1_l75xvi.png",
        alt: "File management interface design"
    },
    {
        src: "https://res.cloudinary.com/barthkosi/image/upload/f_auto,q_auto/v1756359953/cover_lnaewc.png",
        alt: "Portfolio cover design"
    }
];

// ========================================
// PORTFOLIO RENDERER
// ========================================
class PortfolioRenderer {
    constructor(containerSelector, items) {
        this.containerSelector = containerSelector;
        this.items = items;
    }

    render() {
        const container = document.querySelector(this.containerSelector);
        if (!container) {
            console.error(`PortfolioRenderer: Container not found (${this.containerSelector})`);
            return;
        }
        
        if (!this.items || !this.items.length) {
             console.warn('PortfolioRenderer: No items to render');
             return;
        }

        container.innerHTML = this.items.map(item => this.createCard(item)).join('');
        console.log(`PortfolioRenderer: Rendered ${this.items.length} items`);
    }

    createCard(item) {
        const widthAttr = item.width ? `width="${item.width}"` : '';
        const heightAttr = item.height ? `height="${item.height}"` : '';
        
        return `
            <article class="portfolio-item">
                <img src="${item.src}" 
                     alt="${item.alt}" 
                     class="portfolio-image" 
                     ${widthAttr}
                     ${heightAttr}
                     decoding="async">
            </article>
        `;
    }
}

// ========================================
// SIMPLIFIED ANIMATION CONTROLLER
// ========================================
class AnimationController {
  constructor(selector) {
    this.items = document.querySelectorAll(selector);
    if (this.items.length === 0) {
        console.warn('AnimationController: No items found to animate');
        return;
    }
    
    this.observerOptions = {
      root: null,
      rootMargin: '0px', // Trigger as soon as it enters viewport
      threshold: 0.05
    };
    this.init();
  }

  init() {
    // 1. Set Initial State using CSS class (progressive enhancement)
    // If JS fails after this point, items might stay hidden unless we are careful.
    // That's why we rely on CSS default being visible, and JS adding the hide class.
    this.items.forEach((item, index) => {
      item.classList.add('fade-init');
      item.dataset.index = index;
      
      // Failsafe: If animation doesn't trigger within 1.5s, force show
      // This handles cases where IntersectionObserver might fail or get stuck
      setTimeout(() => {
         if (item.classList.contains('fade-init')) {
             item.classList.remove('fade-init');
             item.classList.add('loaded');
         }
      }, 1500);
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
    const index = parseInt(item.dataset.index || 0);
    const delayStep = 100; // ms
    const staggerIndex = index % 5; 
    const delay = staggerIndex * delayStep;

    setTimeout(() => {
      requestAnimationFrame(() => {
        item.classList.remove('fade-init');
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
    // 0. Render Portfolio Items
    this.portfolioRenderer = new PortfolioRenderer('.portfolio-grid', PORTFOLIO_ITEMS);
    this.portfolioRenderer.render();

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