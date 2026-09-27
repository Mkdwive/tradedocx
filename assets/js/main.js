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
    // 7. Testimonials Swiper (Batch Layout Calculation - Zero Thrashing)
    // ------------------------------------------------------------------
    function equalizeClientSpeakHeights(swiperInstance) {
        if (!swiperInstance?.slides?.length) return;
        const inners = [];

        // Phase 1: Batch DOM writes (clear inline heights)
        for (let i = 0; i < swiperInstance.slides.length; i++) {
            const inner = swiperInstance.slides[i].querySelector('.client-testimonial-slide');
            if (inner) {
                inner.style.minHeight = '';
                inners.push(inner);
            }
        }

        if (inners.length === 0) return;

        // Phase 2: Batch DOM reads (single layout reflow)
        let maxHeight = 0;
        for (let i = 0; i < inners.length; i++) {
            const h = inners[i].offsetHeight;
            if (h > maxHeight) maxHeight = h;
        }

        // Phase 3: Batch DOM writes (apply uniform height)
        if (maxHeight > 0) {
            const heightPx = maxHeight + 'px';
            for (let i = 0; i < inners.length; i++) {
                inners[i].style.minHeight = heightPx;
            }
        }
    }

    let clientSpeakSwiper = null;
    if (typeof Swiper !== 'undefined' && document.querySelector('.client-speak-swiper')) {
        clientSpeakSwiper = new Swiper('.client-speak-swiper', {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            speed: 600,
            autoHeight: false,
            grabCursor: true,
            autoplay: {
                delay: 4500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            },
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            pagination: {
                el: '.client-speak-pagination',
                clickable: true,
                renderBullet: function (index, className) {
                    return '<button type="button" class="' + className + '" aria-label="Go to testimonial slide ' + (index + 1) + '"></button>';
                }
            },
            on: {
                init: function () {
                    equalizeClientSpeakHeights(this);
                },
                resize: function () {
                    equalizeClientSpeakHeights(this);
                }
            }
        });
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
            if (clientSpeakSwiper) {
                equalizeClientSpeakHeights(clientSpeakSwiper);
            }
            updateActiveNavLink();
        });
    }
    window.addEventListener('resize', handleResize, { passive: true });

    // Handle custom web fonts load
    if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
            if (clientSpeakSwiper) equalizeClientSpeakHeights(clientSpeakSwiper);
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

    // One-time initial layout setup
    function initLayout() {
        if (clientSpeakSwiper) equalizeClientSpeakHeights(clientSpeakSwiper);
        alignProcessTimelineLine();
        updateActiveNavLink();
        handleScroll();
        initContactForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLayout);
    } else {
        initLayout();
    }
    window.addEventListener('load', initLayout, { once: true });
})();
