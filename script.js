// Add smooth scrolling and any interactive features
document.addEventListener('DOMContentLoaded', function() {
    
    // Smooth scroll for anchor links (if you add any)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add loading animation for portfolio images with error handling
    const portfolioImages = document.querySelectorAll('.portfolio-image');
    portfolioImages.forEach(img => {
        // Handle successful load
        img.addEventListener('load', function() {
            this.classList.add('loaded');
            this.style.opacity = '1';
        });
        
        // Handle load errors
        img.addEventListener('error', function() {
            console.warn('Failed to load image:', this.src);
            // Retry loading after a short delay
            setTimeout(() => {
                const originalSrc = this.src;
                this.src = '';
                this.src = originalSrc;
            }, 1000);
        });
        
        // Set initial state
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
    });

    // Portfolio items without hover effects
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    // Add scroll-based animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe portfolio items for scroll animations
    portfolioItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(item);
    });
});

// Add a simple loading state
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});
