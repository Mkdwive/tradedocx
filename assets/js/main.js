// ======================================================================
// TradeDocX - Main JavaScript File (Optimized)
// ======================================================================

(function () {
    'use strict';

    // ------------------------------------------------------------------
    // 1. Lenis Smooth Scrolling Initialization
    // ------------------------------------------------------------------
    let lenis = null;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.5,
            infinite: false
        });
        window.lenis = lenis;

    }

    // ------------------------------------------------------------------
    // 1b. GSAP & ScrollTrigger Registration & Lenis Sync
    // ------------------------------------------------------------------
    if (typeof gsap !== 'undefined') {
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
        }
        if (lenis) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });
            gsap.ticker.lagSmoothing(0);
        }
    } else if (lenis) {
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    // ------------------------------------------------------------------
    // 2. Cached DOM Elements
    // ------------------------------------------------------------------
    const siteHeader = document.querySelector('.site-header');
    const backToTopBtn = document.getElementById('backToTopBtn');
    const offcanvasEl = document.getElementById('tradeNavbarOffcanvas');
    const processTimelineEl = document.querySelector('.process-timeline');
    const processBadgeEl = document.querySelector('.process-step-badge');
    const processLineEl = document.querySelector('.process-timeline-line');

    const navLinks = Array.from(document.querySelectorAll('.trade-navbar .nav-link[href^="#"]'));
    const navSections = navLinks
        .map(link => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId !== '#') {
                const el = document.querySelector(targetId);
                if (el) return { link, el, id: targetId };
            }
            return null;
        })
        .filter(Boolean);

    // ------------------------------------------------------------------
    // 3. Scroll & Sticky Header State Management (State Caching to avoid Reflows)
    // ------------------------------------------------------------------
    let isScrolled = false;
    let isBackToTopVisible = false;
    let scrollTicking = false;
    let activeNavLink = null;
    let isNavigating = false;
    let navScrollTimeout = null;

    function setActiveLink(link) {
        if (!link) return;
        // Clean all links in the navbar to guarantee only one active link at all times
        navLinks.forEach(item => {
            if (item !== link) {
                item.classList.remove('active');
                item.removeAttribute('aria-current');
            }
        });
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
        activeNavLink = link;
    }

    // Set initial active link
    const initialActive = document.querySelector('.trade-navbar .nav-link.active') || navLinks[0];
    if (initialActive) {
        setActiveLink(initialActive);
    }

    function updateActiveNavLink(scrollY) {
        if (isNavigating || navSections.length === 0) return;

        const y = typeof scrollY === 'number' ? scrollY : (window.scrollY || window.pageYOffset || 0);
        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        const headerHeight = siteHeader ? siteHeader.offsetHeight : 70;
        const triggerOffset = headerHeight + 50;

        // Near bottom of document
        if (windowHeight + y >= docHeight - 50) {
            setActiveLink(navSections[navSections.length - 1].link);
            return;
        }

        // Near top of document
        if (y <= 60) {
            setActiveLink(navSections[0].link);
            return;
        }

        // Find current section in view
        let activeItem = null;
        for (let i = 0; i < navSections.length; i++) {
            const item = navSections[i];
            const rect = item.el.getBoundingClientRect();
            if (rect.top <= triggerOffset) {
                activeItem = item;
            }
        }

        if (activeItem) {
            setActiveLink(activeItem.link);
        } else {
            setActiveLink(navSections[0].link);
        }
    }

    function updateHeaderAndBackToTop(scrollY) {
        const shouldScroll = scrollY > 30;
        if (shouldScroll !== isScrolled) {
            isScrolled = shouldScroll;
            siteHeader?.classList.toggle('scrolled', isScrolled);
            siteHeader?.classList.toggle('is-sticky', isScrolled);
        }

        const shouldShowBackToTop = scrollY > 350;
        if (shouldShowBackToTop !== isBackToTopVisible) {
            isBackToTopVisible = shouldShowBackToTop;
            backToTopBtn?.classList.toggle('show', isBackToTopVisible);
        }
    }

    function handleScroll(scrollY) {
        const y = typeof scrollY === 'number' ? scrollY : (window.scrollY || window.pageYOffset || 0);
        updateHeaderAndBackToTop(y);

        if (!scrollTicking) {
            scrollTicking = true;
            requestAnimationFrame(() => {
                updateActiveNavLink(y);
                scrollTicking = false;
            });
        }
    }

    if (lenis) {
        lenis.on('scroll', (e) => handleScroll(e.scroll));
    }
    window.addEventListener('scroll', () => {
        if (!lenis || lenis.isStopped) {
            handleScroll();
        }
    }, { passive: true });

    // Release programmatic navigation lock if user scrolls manually
    window.addEventListener('wheel', () => { isNavigating = false; }, { passive: true });
    window.addEventListener('touchmove', () => { isNavigating = false; }, { passive: true });

    // ------------------------------------------------------------------
    // 4. Smooth Anchor Navigation Helper
    // ------------------------------------------------------------------
    function scrollToTarget(target, hash) {
        const isHero = !target || hash === '#hero' || hash === '#';
        const headerHeight = siteHeader ? siteHeader.offsetHeight : 70;
        const offset = -(headerHeight + 10);

        if (lenis) {
            if (lenis.isStopped) {
                lenis.start();
            }
            if (isHero) {
                lenis.scrollTo(0, { duration: 1.1, force: true });
            } else {
                lenis.scrollTo(target, { offset: offset, duration: 1.1, force: true });
            }
        } else {
            if (isHero) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const targetTop = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0) + offset;
                window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            }
        }
    }

    // Back to top button action
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToTarget(null, '#hero');
        });
    }

    // ------------------------------------------------------------------
    // 5. Delegated Anchor Click Handler (Desktop & Mobile Offcanvas)
    // ------------------------------------------------------------------
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;

        const hash = anchor.getAttribute('href');
        if (!hash) return;

        const isBrandLogo = anchor.classList.contains('navbar-brand') || anchor.id === 'tradeNavbarOffcanvasLabel';
        if (hash === '#') {
            if (!isBrandLogo) return; // Ignore non-navigational placeholders
        }

        const isHero = hash === '#' || hash === '#hero';
        const target = isHero ? (document.getElementById('hero') || document.body) : document.querySelector(hash);

        if (target || isHero) {
            e.preventDefault();

            // Synchronize active navigation link
            const matchingNavLink = isHero
                ? document.querySelector('.trade-navbar .nav-link[href="#hero"]')
                : document.querySelector(`.trade-navbar .nav-link[href="${hash}"]`);

            const targetNavLink = matchingNavLink || (anchor.classList.contains('nav-link') ? anchor : null);
            if (targetNavLink) {
                setActiveLink(targetNavLink);
                isNavigating = true;
                if (navScrollTimeout) clearTimeout(navScrollTimeout);
                navScrollTimeout = setTimeout(() => {
                    isNavigating = false;
                    updateActiveNavLink();
                }, 1250);
            }

            // Check if mobile offcanvas is open
            const isOffcanvasOpen = offcanvasEl && (
                offcanvasEl.classList.contains('show') ||
                offcanvasEl.classList.contains('showing') ||
                document.body.classList.contains('offcanvas-open')
            );

            if (isOffcanvasOpen && typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl) || bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);

                let navigated = false;
                const handleNavigate = () => {
                    if (navigated) return;
                    navigated = true;

                    document.body.classList.remove('offcanvas-open');
                    siteHeader?.classList.remove('offcanvas-active');
                    if (lenis && lenis.isStopped) {
                        lenis.start();
                    }

                    requestAnimationFrame(() => {
                        scrollToTarget(target, hash);
                    });
                };

                offcanvasEl.addEventListener('hidden.bs.offcanvas', handleNavigate, { once: true });
                setTimeout(handleNavigate, 350);

                bsOffcanvas.hide();
            } else {
                scrollToTarget(target, hash);
            }
        }
    });

    // ------------------------------------------------------------------
    // 6. Offcanvas Scroll Lock Integration
    // ------------------------------------------------------------------
    if (offcanvasEl) {
        offcanvasEl.addEventListener('show.bs.offcanvas', () => {
            lenis?.stop();
            document.body.classList.add('offcanvas-open');
            siteHeader?.classList.add('offcanvas-active');
        });
        offcanvasEl.addEventListener('hidden.bs.offcanvas', () => {
            lenis?.start();
            document.body.classList.remove('offcanvas-open');
            siteHeader?.classList.remove('offcanvas-active');
        });
    }

    // ------------------------------------------------------------------
    // 7. Testimonials Swiper Slider & Staggered Avatar Thumbnail Sync
    // ------------------------------------------------------------------
    let testimonialSwiper = null;
    let thumbsSwiper = null;
    let activeCircleEl = null;
    const testimonialThumbs = Array.from(document.querySelectorAll('.testimonial-thumb-item'));

    function onCircleAnimationComplete(e) {
        if (e.animationName !== 'tp-border-loader') return;
        if (testimonialSwiper) {
            testimonialSwiper.slideNext(600);
        }
    }

    function setTestimonialActiveThumb(realIndex) {
        if (!testimonialThumbs.length) return;

        // Detach listener from previously active circle
        if (activeCircleEl) {
            activeCircleEl.removeEventListener('animationend', onCircleAnimationComplete);
            activeCircleEl = null;
        }

        testimonialThumbs.forEach((thumb, idx) => {
            const isActive = idx === realIndex;
            if (isActive) {
                // Reset CSS animation cleanly by toggling class and triggering reflow
                thumb.classList.remove('is-active');
                void thumb.offsetWidth;
                thumb.classList.add('is-active');
                thumb.setAttribute('aria-selected', 'true');

                // Attach listener to active circle: when circle animation completes (5s), advance to next slide
                const circle = thumb.querySelector('.tp-border-loader svg circle:last-child');
                if (circle) {
                    activeCircleEl = circle;
                    circle.addEventListener('animationend', onCircleAnimationComplete, { once: true });
                }
            } else {
                thumb.classList.remove('is-active');
                thumb.setAttribute('aria-selected', 'false');
            }
        });

        // On mobile/smaller devices, slide thumbnail carousel so active image is first
        if (thumbsSwiper && window.innerWidth < 992) {
            thumbsSwiper.slideTo(realIndex, 400);
        }
    }

    const thumbsSwiperEl = document.querySelector('.testimonial-thumbs-swiper');
    if (typeof Swiper !== 'undefined' && thumbsSwiperEl) {
        thumbsSwiper = new Swiper('.testimonial-thumbs-swiper', {
            slidesPerView: 3,
            spaceBetween: 14,
            watchSlidesProgress: true,
            grabCursor: true,
            breakpoints: {
                576: {
                    slidesPerView: 4,
                    spaceBetween: 18
                },
                768: {
                    slidesPerView: 5,
                    spaceBetween: 20
                },
                992: {
                    slidesPerView: 7,
                    spaceBetween: 24,
                    allowTouchMove: false
                }
            }
        });
    }

    const testimonialSwiperEl = document.querySelector('.testimonial-main-swiper');
    if (typeof Swiper !== 'undefined' && testimonialSwiperEl) {
        testimonialSwiper = new Swiper('.testimonial-main-swiper', {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            speed: 600,
            autoHeight: true,
            grabCursor: true,
            autoplay: false, // Driven directly by the circular loader animationend event
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            on: {
                slideChange: function () {
                    setTestimonialActiveThumb(this.realIndex);
                }
            }
        });

        // Sync clicking avatar thumbnails to slideToLoop
        testimonialThumbs.forEach(thumb => {
            function activateThumb() {
                const targetIdx = parseInt(thumb.getAttribute('data-index'), 10);
                if (!isNaN(targetIdx) && testimonialSwiper) {
                    testimonialSwiper.slideToLoop(targetIdx, 600);
                    if (thumbsSwiper && window.innerWidth < 992) {
                        thumbsSwiper.slideTo(targetIdx, 400);
                    }
                }
            }

            thumb.addEventListener('click', activateThumb);
            thumb.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activateThumb();
                }
            });
        });

        // Set initial active state (starts with avatar 0 / Rajesh Mehta)
        setTestimonialActiveThumb(0);
        if (thumbsSwiper) {
            thumbsSwiper.slideTo(0, 0);
        }
    }

    // ------------------------------------------------------------------
    // 7b. Testimonial Background Watermark & Wave GSAP On-Scroll Parallax
    // ------------------------------------------------------------------
    let testimonialGSAPInitialized = false;

    function initTestimonialGSAP() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        if (testimonialGSAPInitialized) return;

        const testimonialSection = document.getElementById('testimonials');
        if (!testimonialSection) return;

        testimonialGSAPInitialized = true;

        const bgTextH2 = testimonialSection.querySelector('.td-testimonial-bg-text h2');
        const waveParallax = testimonialSection.querySelector('.td-testimonial-wave-parallax');

        // Cinematic Parallax for Huge "Testimonials" Watermark Text
        if (bgTextH2) {
            gsap.fromTo(bgTextH2,
                { xPercent: -10, opacity: 1 },
                {
                    xPercent: 10,
                    opacity: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: testimonialSection,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 1.2
                    }
                }
            );
        }

        // Elegant Parallax for Bottom Wave Element (Zero edge gaps)
        if (waveParallax) {
            gsap.fromTo(waveParallax,
                { y: 12 },
                {
                    y: -12,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: testimonialSection,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 1.6
                    }
                }
            );
        }
    }

    // ------------------------------------------------------------------
    // 7c. Industries Background Wave GSAP On-Scroll Parallax
    // ------------------------------------------------------------------
    let industriesGSAPInitialized = false;

    function initIndustriesGSAP() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        if (industriesGSAPInitialized) return;

        const industriesSection = document.getElementById('industries');
        const industriesWave = document.querySelector('.industries-bg-wave');

        if (!industriesSection || !industriesWave) return;

        industriesGSAPInitialized = true;

        gsap.fromTo(industriesWave,
            { yPercent: -6, xPercent: -3 },
            {
                yPercent: 6,
                xPercent: 3,
                ease: 'none',
                scrollTrigger: {
                    trigger: industriesSection,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.6
                }
            }
        );
    }

    // ------------------------------------------------------------------
    // 7d. Contact Us Background SVG Wave GSAP On-Scroll Parallax
    // ------------------------------------------------------------------
    let contactGSAPInitialized = false;

    function initContactGSAP() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        if (contactGSAPInitialized) return;

        const contactSection = document.getElementById('contact');
        const contactWave = document.querySelector('.contact-bg-wave');

        if (!contactSection || !contactWave) return;

        contactGSAPInitialized = true;

        gsap.fromTo(contactWave,
            { y: -12, x: -10 },
            {
                y: 14,
                x: 10,
                ease: 'none',
                scrollTrigger: {
                    trigger: contactSection,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.8
                }
            }
        );
    }

    // ------------------------------------------------------------------
    // 8. Process Timeline Center Alignment
    // ------------------------------------------------------------------
    function alignProcessTimelineLine() {
        if (window.innerWidth < 992 || !processTimelineEl || !processBadgeEl || !processLineEl) return;
        const timelineRect = processTimelineEl.getBoundingClientRect();
        const badgeRect = processBadgeEl.getBoundingClientRect();
        const centerY = Math.round((badgeRect.top + badgeRect.height / 2) - timelineRect.top);
        processLineEl.style.top = centerY + 'px';
        processLineEl.style.transform = 'translateY(-50%)';
    }

    // ------------------------------------------------------------------
    // 9. Consolidated & RAF-Debounced Resize & Initialization
    // ------------------------------------------------------------------
    let resizeTimer = null;
    function handleResize() {
        if (resizeTimer) cancelAnimationFrame(resizeTimer);
        resizeTimer = requestAnimationFrame(() => {
            // Auto-close offcanvas when resized to desktop breakpoint
            if (window.innerWidth >= 992 && offcanvasEl?.classList.contains('show')) {
                const bsOffcanvas = bootstrap?.Offcanvas?.getInstance(offcanvasEl);
                bsOffcanvas?.hide();
            }
            alignProcessTimelineLine();
            if (typeof ScrollTrigger !== 'undefined') {
                ScrollTrigger.refresh();
            }
            if (testimonialSwiper) {
                testimonialSwiper.update();
            }
            if (thumbsSwiper) {
                thumbsSwiper.update();
            }
            updateActiveNavLink();
        });
    }
    window.addEventListener('resize', handleResize, { passive: true });

    // Handle custom web fonts load
    if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
            if (testimonialSwiper) testimonialSwiper.update();
            if (thumbsSwiper) thumbsSwiper.update();
            alignProcessTimelineLine();
            updateActiveNavLink();
        });
    }

    // ------------------------------------------------------------------
    // 10. Contact Form Interactive Validation & Handling
    // ------------------------------------------------------------------
    function initContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm || contactForm.dataset.validationInitialized) return;
        contactForm.dataset.validationInitialized = 'true';

        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('businessEmail');
        const phoneInput = document.getElementById('phoneNumber');
        const companyInput = document.getElementById('companyName');
        const messageInput = document.getElementById('messageText');
        const submitBtn = document.getElementById('contactSubmitBtn');
        const successAlert = document.getElementById('contactSuccessAlert');
        const successMessage = document.getElementById('contactSuccessMessage');
        const dismissAlertBtn = document.getElementById('dismissSuccessAlert');

        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        const phoneRegex = /^[\d\s+\-()]{7,20}$/;

        function validateField(input) {
            if (!input) return true;
            const val = input.value.trim();
            const errorEl = document.getElementById(input.id + 'Error');
            let isValid = true;
            let errorMessage = '';

            if (input === fullNameInput) {
                if (!val) {
                    isValid = false;
                    errorMessage = 'Please enter your full name.';
                } else if (val.length < 2) {
                    isValid = false;
                    errorMessage = 'Full name must be at least 2 characters.';
                } else if (!/^[a-zA-Z\s.'\-]+$/.test(val)) {
                    isValid = false;
                    errorMessage = 'Full name should only contain letters and standard name punctuation.';
                }
            } else if (input === emailInput) {
                if (!val) {
                    isValid = false;
                    errorMessage = 'Please enter your business email.';
                } else if (!emailRegex.test(val)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid business email address (e.g. name@company.com).';
                }
            } else if (input === phoneInput) {
                if (val.length > 0) {
                    const digitsOnly = val.replace(/\D/g, '');
                    if (!phoneRegex.test(val) || digitsOnly.length < 7 || digitsOnly.length > 15) {
                        isValid = false;
                        errorMessage = 'Please enter a valid phone number (at least 7 digits).';
                    }
                }
            } else if (input === companyInput) {
                if (val.length > 100) {
                    isValid = false;
                    errorMessage = 'Company name cannot exceed 100 characters.';
                }
            } else if (input === messageInput) {
                if (!val) {
                    isValid = false;
                    errorMessage = 'Please enter your message.';
                } else if (val.length < 10) {
                    isValid = false;
                    errorMessage = 'Please provide a bit more detail (at least 10 characters).';
                }
            }

            if (!isValid) {
                input.classList.add('is-invalid');
                input.classList.remove('is-valid');
                input.setAttribute('aria-invalid', 'true');
                if (errorEl && errorMessage) {
                    errorEl.textContent = errorMessage;
                }
            } else {
                input.classList.remove('is-invalid');
                input.removeAttribute('aria-invalid');
                if (errorEl) {
                    errorEl.textContent = '';
                }
                if (val.length > 0) {
                    input.classList.add('is-valid');
                } else {
                    input.classList.remove('is-valid');
                }
            }

            return isValid;
        }

        const formFields = [fullNameInput, emailInput, phoneInput, companyInput, messageInput].filter(Boolean);

        formFields.forEach(field => {
            field.addEventListener('blur', function () {
                validateField(this);
            });

            field.addEventListener('input', function () {
                if (this.classList.contains('is-invalid')) {
                    validateField(this);
                }
            });
        });

        if (dismissAlertBtn && successAlert) {
            dismissAlertBtn.addEventListener('click', function () {
                successAlert.classList.add('d-none');
            });
        }

        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            let isFormValid = true;
            let firstInvalidField = null;

            formFields.forEach(field => {
                const isFieldValid = validateField(field);
                if (!isFieldValid) {
                    isFormValid = false;
                    if (!firstInvalidField) {
                        firstInvalidField = field;
                    }
                }
            });

            if (!isFormValid) {
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
                return;
            }

            // Valid submission flow
            const btnText = submitBtn?.querySelector('.btn-text');
            const spinner = submitBtn?.querySelector('.spinner-border');

            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.textContent = 'Sending...';
            if (spinner) spinner.classList.remove('d-none');

            setTimeout(() => {
                const enteredName = fullNameInput ? fullNameInput.value.trim() : '';

                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.textContent = 'Get in Touch';
                if (spinner) spinner.classList.add('d-none');

                contactForm.reset();
                formFields.forEach(field => {
                    field.classList.remove('is-valid', 'is-invalid');
                    field.removeAttribute('aria-invalid');
                });

                if (successAlert) {
                    if (successMessage && enteredName) {
                        successMessage.textContent = `Thank you, ${enteredName}! Your request has been received. Our trade documentation team will contact you shortly.`;
                    }
                    successAlert.classList.remove('d-none');
                    successAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 600);
        });
    }

    // ------------------------------------------------------------------
    // 11. GSAP "How It Works" Timeline Scroll Animation
    // ------------------------------------------------------------------
    let processTimelineInitialized = false;

    function initProcessTimelineGSAP() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        if (processTimelineInitialized) return;

        const processSection = document.getElementById('process');
        const timelineEl = document.querySelector('.process-timeline');
        if (!processSection || !timelineEl) return;

        processTimelineInitialized = true;

        const headerEl = processSection.querySelector('.how-it-works-header');
        const baseTrack = timelineEl.querySelector('.timeline-base-track');
        const seg1Fill = timelineEl.querySelector('.segment-1 .timeline-segment-fill');
        const seg2Fill = timelineEl.querySelector('.segment-2 .timeline-segment-fill');
        const seg3Fill = timelineEl.querySelector('.segment-3 .timeline-segment-fill');
        const travelerDot = timelineEl.querySelector('.timeline-traveler-dot');
        const stepItems = Array.from(timelineEl.querySelectorAll('.process-step-item'));
        const badges = stepItems.map(item => item.querySelector('.process-step-badge'));

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            if (baseTrack) baseTrack.style.display = 'none';
            if (seg1Fill) seg1Fill.style.width = '100%';
            if (seg2Fill) seg2Fill.style.width = '100%';
            if (seg3Fill) seg3Fill.style.width = '100%';
            stepItems.forEach(item => { item.style.opacity = '1'; });
            badges.forEach(badge => {
                if (badge) {
                    badge.style.transform = 'none';
                    badge.classList.add('is-step-active');
                }
            });
            if (travelerDot) travelerDot.style.opacity = '1';
            return;
        }

        // 1. Subtle, high-end reveal for the section header
        if (headerEl) {
            gsap.fromTo(
                headerEl,
                { opacity: 0, y: 35 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.85,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: headerEl,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        }

        const dotColors = [
            { border: '#113DBE', shadow: '0 0 10px rgba(17, 61, 190, 0.4)' },
            { border: '#C20E0E', shadow: '0 0 10px rgba(194, 14, 14, 0.4)' },
            { border: '#007404', shadow: '0 0 10px rgba(0, 116, 4, 0.4)' },
            { border: '#DD8E10', shadow: '0 0 10px rgba(221, 142, 16, 0.4)' }
        ];

        function syncTimelineMilestones(progressVal) {
            // Milestone activation thresholds (Steps 1, 2, 3, 4)
            const thresholds = [0.01, 0.32, 0.63, 0.94];
            let activeIdx = -1;

            thresholds.forEach((th, idx) => {
                if (progressVal >= th) {
                    badges[idx]?.classList.add('is-step-active');
                    stepItems[idx]?.classList.add('is-step-active');
                    activeIdx = idx;
                } else {
                    badges[idx]?.classList.remove('is-step-active');
                    stepItems[idx]?.classList.remove('is-step-active');
                }
            });

            if (travelerDot) {
                if (progressVal < 0.01) {
                    travelerDot.style.opacity = '0';
                } else {
                    travelerDot.style.opacity = '1';
                    const colorObj = dotColors[Math.max(0, activeIdx)];
                    if (colorObj) {
                        travelerDot.style.borderColor = colorObj.border;
                        travelerDot.style.boxShadow = colorObj.shadow;
                    }
                }
            }
        }

        // GSAP matchMedia handles desktop/tablet vs mobile seamlessly
        const mm = gsap.matchMedia();

        // Desktop and Tablet: Horizontal Timeline Progression
        mm.add('(min-width: 768px)', () => {
            // Set initial resting states
            if (baseTrack) gsap.set(baseTrack, { clipPath: 'inset(0 0 0 0%)' });
            if (seg1Fill) gsap.set(seg1Fill, { width: '0%', height: '100%' });
            if (seg2Fill) gsap.set(seg2Fill, { width: '0%', height: '100%' });
            if (seg3Fill) gsap.set(seg3Fill, { width: '0%', height: '100%' });
            gsap.set(stepItems, { opacity: 0.55 });
            gsap.set(badges, { scale: 0.95 });
            if (travelerDot) gsap.set(travelerDot, { opacity: 0, scale: 0.8, left: '0%' });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: timelineEl,
                    start: 'top 75%',
                    end: 'bottom 50%',
                    scrub: 0.8,
                    onUpdate: (self) => syncTimelineMilestones(self.progress)
                }
            });

            // Step 1: Immediate activation at the beginning of the timeline
            tl.to(stepItems[0], { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0)
              .to(badges[0], { scale: 1, duration: 0.2, ease: 'back.out(1.4)' }, 0)
              .to(travelerDot, { opacity: 1, scale: 1, duration: 0.15 }, 0)

              // Line draws from Step 1 to Step 2 in #DBEAFE
              // Notice: baseTrack clipPath retreats simultaneously so the dashed line disappears under the solid line
              .to(seg1Fill, { width: '100%', duration: 0.8, ease: 'none' }, 0.1)
              .to(baseTrack, { clipPath: 'inset(0 0 0 33.333%)', duration: 0.8, ease: 'none' }, 0.1)
              .to(travelerDot, { left: '33.333%', duration: 0.8, ease: 'none' }, 0.1)
              .to(stepItems[1], { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.7)
              .to(badges[1], { scale: 1, duration: 0.3, ease: 'back.out(1.4)' }, 0.7)

              // Line draws from Step 2 to Step 3 in #FFE4E6
              .to(seg2Fill, { width: '100%', duration: 0.8, ease: 'none' }, 0.9)
              .to(baseTrack, { clipPath: 'inset(0 0 0 66.666%)', duration: 0.8, ease: 'none' }, 0.9)
              .to(travelerDot, { left: '66.666%', duration: 0.8, ease: 'none' }, 0.9)
              .to(stepItems[2], { opacity: 1, duration: 0.3, ease: 'power2.out' }, 1.5)
              .to(badges[2], { scale: 1, duration: 0.3, ease: 'back.out(1.4)' }, 1.5)

              // Line draws from Step 3 to Step 4 in #D1FAE5
              .to(seg3Fill, { width: '100%', duration: 0.8, ease: 'none' }, 1.7)
              .to(baseTrack, { clipPath: 'inset(0 0 0 100%)', duration: 0.8, ease: 'none' }, 1.7)
              .to(travelerDot, { left: '100%', duration: 0.8, ease: 'none' }, 1.7)
              .to(stepItems[3], { opacity: 1, duration: 0.3, ease: 'power2.out' }, 2.3)
              .to(badges[3], { scale: 1, duration: 0.3, ease: 'back.out(1.4)' }, 2.3);

            return () => {
                tl.kill();
            };
        });

        // Mobile (< 768px): Vertical Timeline Progression
        mm.add('(max-width: 767.98px)', () => {
            // Set initial resting states for vertical layout
            if (baseTrack) gsap.set(baseTrack, { clipPath: 'inset(0% 0 0 0)' });
            if (seg1Fill) gsap.set(seg1Fill, { height: '0%', width: '100%' });
            if (seg2Fill) gsap.set(seg2Fill, { height: '0%', width: '100%' });
            if (seg3Fill) gsap.set(seg3Fill, { height: '0%', width: '100%' });
            gsap.set(stepItems, { opacity: 0.55 });
            gsap.set(badges, { scale: 0.95 });
            if (travelerDot) gsap.set(travelerDot, { opacity: 0, scale: 0.8, top: '0%' });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: timelineEl,
                    start: 'top 75%',
                    end: 'bottom 60%',
                    scrub: 0.8,
                    onUpdate: (self) => syncTimelineMilestones(self.progress)
                }
            });

            // Step 1: Immediate activation at the beginning of the timeline
            tl.to(stepItems[0], { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0)
              .to(badges[0], { scale: 1, duration: 0.2, ease: 'back.out(1.4)' }, 0)
              .to(travelerDot, { opacity: 1, scale: 1, duration: 0.15 }, 0)

              // Line draws down from Step 1 to Step 2
              .to(seg1Fill, { height: '100%', duration: 0.8, ease: 'none' }, 0.1)
              .to(baseTrack, { clipPath: 'inset(33.333% 0 0 0)', duration: 0.8, ease: 'none' }, 0.1)
              .to(travelerDot, { top: '33.333%', duration: 0.8, ease: 'none' }, 0.1)
              .to(stepItems[1], { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.7)
              .to(badges[1], { scale: 1, duration: 0.3, ease: 'back.out(1.4)' }, 0.7)

              // Line draws down from Step 2 to Step 3
              .to(seg2Fill, { height: '100%', duration: 0.8, ease: 'none' }, 0.9)
              .to(baseTrack, { clipPath: 'inset(66.666% 0 0 0)', duration: 0.8, ease: 'none' }, 0.9)
              .to(travelerDot, { top: '66.666%', duration: 0.8, ease: 'none' }, 0.9)
              .to(stepItems[2], { opacity: 1, duration: 0.3, ease: 'power2.out' }, 1.5)
              .to(badges[2], { scale: 1, duration: 0.3, ease: 'back.out(1.4)' }, 1.5)

              // Line draws down from Step 3 to Step 4
              .to(seg3Fill, { height: '100%', duration: 0.8, ease: 'none' }, 1.7)
              .to(baseTrack, { clipPath: 'inset(100% 0 0 0)', duration: 0.8, ease: 'none' }, 1.7)
              .to(travelerDot, { top: '100%', duration: 0.8, ease: 'none' }, 1.7)
              .to(stepItems[3], { opacity: 1, duration: 0.3, ease: 'power2.out' }, 2.3)
              .to(badges[3], { scale: 1, duration: 0.3, ease: 'back.out(1.4)' }, 2.3);

            return () => {
                tl.kill();
            };
        });
    }

    // One-time initial layout setup
    function initLayout() {
        alignProcessTimelineLine();
        initProcessTimelineGSAP();
        initTestimonialGSAP();
        initIndustriesGSAP();
        initContactGSAP();
        updateActiveNavLink();
        handleScroll();
        initContactForm();
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLayout);
    } else {
        initLayout();
    }
    window.addEventListener('load', initLayout, { once: true });
})();
