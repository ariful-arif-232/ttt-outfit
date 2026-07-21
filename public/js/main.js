document.addEventListener('DOMContentLoaded', () => {
  /* =========================
     STICKY HEADER
  ========================= */

  const siteHeader =
    document.getElementById('siteHeader');

  function updateHeaderOnScroll() {
    if (!siteHeader) return;

    siteHeader.classList.toggle(
      'scrolled',
      window.scrollY > 25
    );
  }

  window.addEventListener(
    'scroll',
    updateHeaderOnScroll,
    { passive: true }
  );

  updateHeaderOnScroll();


  /* =========================
     MOBILE MENU
  ========================= */

  const menuButton =
    document.getElementById('mobileMenuButton');

  const navLinks =
    document.getElementById('navLinks');

  function closeMobileMenu() {
    if (!menuButton || !navLinks) return;

    navLinks.classList.remove('active');
    menuButton.classList.remove('active');
    document.body.classList.remove('menu-open');

    menuButton.setAttribute(
      'aria-expanded',
      'false'
    );
  }

  if (menuButton && navLinks) {
    menuButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      const shouldOpen =
        !navLinks.classList.contains('active');

      navLinks.classList.toggle(
        'active',
        shouldOpen
      );

      menuButton.classList.toggle(
        'active',
        shouldOpen
      );

      document.body.classList.toggle(
        'menu-open',
        shouldOpen
      );

      menuButton.setAttribute(
        'aria-expanded',
        String(shouldOpen)
      );
    });

    navLinks.addEventListener('click', event => {
      event.stopPropagation();
    });

    navLinks
      .querySelectorAll('a')
      .forEach(link => {
        link.addEventListener(
          'click',
          closeMobileMenu
        );
      });

    document.addEventListener(
      'click',
      closeMobileMenu
    );

    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape') {
          closeMobileMenu();
        }
      }
    );

    window.addEventListener('resize', () => {
      if (window.innerWidth > 950) {
        closeMobileMenu();
      }
    });
  }

  /* =========================
     MOBILE HEADER SEARCH
  ========================= */

  const mobileSearchToggle =
    document.getElementById('mobileSearchToggle');

  const mobileSearchPanel =
    document.getElementById('mobileSearchPanel');

  const mobileSearchInput =
    mobileSearchPanel?.querySelector(
      'input[type="search"]'
    );


  function closeMobileSearch() {
    if (!mobileSearchToggle || !mobileSearchPanel) {
      return;
    }

    mobileSearchPanel.classList.remove('active');

    mobileSearchToggle.setAttribute(
      'aria-expanded',
      'false'
    );
  }


  function openMobileSearch() {
    if (!mobileSearchToggle || !mobileSearchPanel) {
      return;
    }

    closeMobileMenu();

    mobileSearchPanel.classList.add('active');

    mobileSearchToggle.setAttribute(
      'aria-expanded',
      'true'
    );

    window.setTimeout(() => {
      mobileSearchInput?.focus();
    }, 150);
  }


  if (mobileSearchToggle && mobileSearchPanel) {

    mobileSearchToggle.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();

        const isOpen =
          mobileSearchPanel.classList.contains(
            'active'
          );

        if (isOpen) {
          closeMobileSearch();
        } else {
          openMobileSearch();
        }
      }
    );


    mobileSearchPanel.addEventListener(
      'click',
      event => {
        event.stopPropagation();
      }
    );


    document.addEventListener(
      'click',
      closeMobileSearch
    );


    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape') {
          closeMobileSearch();
        }
      }
    );


    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth > 950) {
          closeMobileSearch();
        }
      }
    );

  }
  /* =========================
     HERO SLIDER
  ========================= */

  const slides = Array.from(
    document.querySelectorAll('.hero-slide')
  );

  const dots = Array.from(
    document.querySelectorAll('.hero-dot')
  );

  const previousButton =
    document.querySelector('.hero-prev');

  const nextButton =
    document.querySelector('.hero-next');

  let currentSlide = 0;
  let sliderTimer = null;

  function showSlide(index) {
    if (!slides.length) return;

    currentSlide =
      (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      const isActive =
        slideIndex === currentSlide;

      slide.classList.toggle(
        'active',
        isActive
      );

      slide.setAttribute(
        'aria-hidden',
        String(!isActive)
      );
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle(
        'active',
        dotIndex === currentSlide
      );
    });
  }

  function stopSlider() {
    if (!sliderTimer) return;

    clearInterval(sliderTimer);
    sliderTimer = null;
  }

  function startSlider() {
    stopSlider();

    if (slides.length < 2) return;

    sliderTimer = setInterval(() => {
      showSlide(currentSlide + 1);
    }, 2500);
  }

  previousButton?.addEventListener(
    'click',
    () => {
      showSlide(currentSlide - 1);
      startSlider();
    }
  );

  nextButton?.addEventListener(
    'click',
    () => {
      showSlide(currentSlide + 1);
      startSlider();
    }
  );

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      startSlider();
    });
  });

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        stopSlider();
      } else {
        startSlider();
      }
    }
  );

  showSlide(0);
  startSlider();


  /* =========================
     SCROLL REVEAL
  ========================= */

  const revealElements =
    document.querySelectorAll('.reveal');

  revealElements.forEach(element => {
    element.classList.add('reveal-ready');
  });

  if ('IntersectionObserver' in window) {
    const revealObserver =
      new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add(
              'visible'
            );

            revealObserver.unobserve(
              entry.target
            );
          });
        },
        {
          threshold: 0.08
        }
      );

    revealElements.forEach(element => {
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach(element => {
      element.classList.add('visible');
    });
  }
  /* =========================
   SHOP FILTER DRAWER
========================= */

const shopFilterButton =
  document.getElementById('shopFilterButton');

const shopSidebar =
  document.getElementById('shopSidebar');

const shopFilterClose =
  document.getElementById('shopFilterClose');

const shopFilterOverlay =
  document.getElementById('shopFilterOverlay');

function openShopFilters() {
  if (!shopSidebar || !shopFilterOverlay) return;

  shopSidebar.classList.add('active');
  shopFilterOverlay.classList.add('active');

  shopFilterButton?.setAttribute(
    'aria-expanded',
    'true'
  );

  document.body.style.overflow = 'hidden';
}

function closeShopFilters() {
  if (!shopSidebar || !shopFilterOverlay) return;

  shopSidebar.classList.remove('active');
  shopFilterOverlay.classList.remove('active');

  shopFilterButton?.setAttribute(
    'aria-expanded',
    'false'
  );

  document.body.style.overflow = '';
}

shopFilterButton?.addEventListener(
  'click',
  openShopFilters
);

shopFilterClose?.addEventListener(
  'click',
  closeShopFilters
);

shopFilterOverlay?.addEventListener(
  'click',
  closeShopFilters
);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeShopFilters();
  }
});
  window.addEventListener('resize', () => {
  if (window.innerWidth > 950) {
    closeShopFilters();
  }
});
});

/* =========================================================
   TTT Outfit Phase 6 — accessible, responsive homepage polish
   Scoped to ttt-* classes so existing ecommerce pages remain intact.
========================================================= */
(() => {
  'use strict';

  const ready = (fn) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

  ready(() => {
    const body = document.body;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const drawer = document.getElementById('tttDrawer');
    const drawerBackdrop = document.querySelector('.ttt-drawer-backdrop');
    const menuTrigger = document.querySelector('.ttt-menu-trigger');
    const drawerClosers = document.querySelectorAll('[data-drawer-close]');
    let lastFocusedElement = null;

    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const setDrawer = (open) => {
      if (!drawer || !drawerBackdrop || !menuTrigger) return;
      if (open) lastFocusedElement = document.activeElement;
      drawer.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      menuTrigger.setAttribute('aria-expanded', String(open));
      drawerBackdrop.hidden = !open;
      requestAnimationFrame(() => drawerBackdrop.classList.toggle('is-visible', open));
      body.classList.toggle('ttt-drawer-open', open);
      if (open) drawer.querySelector(focusableSelector)?.focus();
      else if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
    };

    menuTrigger?.addEventListener('click', () => setDrawer(true));
    drawerClosers.forEach((el) => el.addEventListener('click', () => setDrawer(false)));

    drawer?.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const focusable = [...drawer.querySelectorAll(focusableSelector)].filter((el) => !el.hidden && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    document.querySelectorAll('.ttt-drawer-group-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const submenu = button.nextElementSibling;
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        if (submenu) submenu.hidden = expanded;
      });
    });

    const searchPanel = document.getElementById('tttSearchPanel');
    const searchTrigger = document.querySelector('.ttt-search-trigger');
    const searchClose = document.querySelector('.ttt-search-close');
    const setSearch = (open) => {
      if (!searchPanel || !searchTrigger) return;
      searchPanel.hidden = !open;
      searchTrigger.setAttribute('aria-expanded', String(open));
      if (open) window.setTimeout(() => searchPanel.querySelector('input')?.focus(), 20);
      else searchTrigger.focus();
    };
    searchTrigger?.addEventListener('click', () => setSearch(searchPanel?.hidden !== false));
    searchClose?.addEventListener('click', () => setSearch(false));
    document.addEventListener('pointerdown', (event) => {
      if (searchPanel && !searchPanel.hidden && !searchPanel.contains(event.target) && !searchTrigger?.contains(event.target)) setSearch(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { setDrawer(false); setSearch(false); }
    });

    const slider = document.querySelector('[data-hero-slider]');
    if (slider) {
      const slides = [...slider.querySelectorAll('.ttt-hero-slide')];
      const dots = [...slider.querySelectorAll('.ttt-hero-dots button')];
      const prev = slider.querySelector('.ttt-hero-prev');
      const next = slider.querySelector('.ttt-hero-next');
      let index = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
      let timer = null;
      let touchStartX = 0;

      const show = (newIndex, announce = false) => {
        if (!slides.length) return;
        index = (newIndex + slides.length) % slides.length;
        slides.forEach((slide, i) => {
          const active = i === index;
          slide.classList.toggle('is-active', active);
          slide.setAttribute('aria-hidden', String(!active));
        });
        dots.forEach((dot, i) => {
          const active = i === index;
          dot.classList.toggle('is-active', active);
          dot.setAttribute('aria-selected', String(active));
          dot.tabIndex = active ? 0 : -1;
        });
        if (announce) slider.setAttribute('aria-label', `Featured collections, slide ${index + 1} of ${slides.length}`);
      };

      const stop = () => { if (timer) clearInterval(timer); timer = null; };
      const start = () => {
        stop();
        if (slides.length > 1 && !reducedMotion.matches && !document.hidden) timer = setInterval(() => show(index + 1), 6000);
      };

      prev?.addEventListener('click', () => { show(index - 1, true); start(); });
      next?.addEventListener('click', () => { show(index + 1, true); start(); });
      dots.forEach((dot, i) => {
        dot.addEventListener('click', () => { show(i, true); start(); });
        dot.addEventListener('keydown', (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          let target = i;
          if (event.key === 'ArrowLeft') target = i - 1;
          if (event.key === 'ArrowRight') target = i + 1;
          if (event.key === 'Home') target = 0;
          if (event.key === 'End') target = dots.length - 1;
          show(target, true); dots[index]?.focus(); start();
        });
      });
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      slider.addEventListener('focusin', stop);
      slider.addEventListener('focusout', start);
      slider.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
      slider.addEventListener('touchend', (e) => {
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 45) show(index + (delta < 0 ? 1 : -1), true);
        start();
      }, { passive: true });
      document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
      reducedMotion.addEventListener?.('change', start);
      show(index); start();
    }

    document.querySelectorAll('[data-product-rail-section]').forEach((section) => {
      const rail = section.querySelector('[data-product-rail]');
      const prev = section.querySelector('[data-rail-prev]');
      const next = section.querySelector('[data-rail-next]');
      if (!rail) return;

      const amount = () => Math.max(280, rail.clientWidth * 0.82);
      const updateButtons = () => {
        const max = Math.max(0, rail.scrollWidth - rail.clientWidth - 2);
        if (prev) prev.disabled = rail.scrollLeft <= 2;
        if (next) next.disabled = rail.scrollLeft >= max;
      };
      prev?.addEventListener('click', () => rail.scrollBy({ left: -amount(), behavior: reducedMotion.matches ? 'auto' : 'smooth' }));
      next?.addEventListener('click', () => rail.scrollBy({ left: amount(), behavior: reducedMotion.matches ? 'auto' : 'smooth' }));
      rail.addEventListener('scroll', updateButtons, { passive: true });
      window.addEventListener('resize', updateButtons, { passive: true });

      let dragging = false;
      let startX = 0;
      let startScroll = 0;
      rail.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch' || event.target.closest('a, button, input, select, label')) return;
        dragging = true; startX = event.clientX; startScroll = rail.scrollLeft;
        rail.classList.add('is-dragging'); rail.setPointerCapture(event.pointerId);
      });
      rail.addEventListener('pointermove', (event) => { if (dragging) rail.scrollLeft = startScroll - (event.clientX - startX); });
      const endDrag = () => { dragging = false; rail.classList.remove('is-dragging'); };
      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
      rail.addEventListener('lostpointercapture', endDrag);
      updateButtons();
    });

    const revealItems = document.querySelectorAll('.ttt-reveal');
    if ('IntersectionObserver' in window && !reducedMotion.matches) {
      const observer = new IntersectionObserver((entries, obs) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      }), { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
      revealItems.forEach((item) => observer.observe(item));
    } else revealItems.forEach((item) => item.classList.add('is-visible'));

    const newsletter = document.querySelector('.ttt-newsletter-form');
    newsletter?.addEventListener('submit', (event) => {
      const input = newsletter.querySelector('input[type="email"]');
      const button = newsletter.querySelector('button[type="submit"]');
      const status = newsletter.querySelector('.ttt-newsletter-status');
      if (!input?.checkValidity()) {
        event.preventDefault();
        input.setAttribute('aria-invalid', 'true');
        if (status) status.textContent = 'Please enter a valid email address.';
        input.reportValidity(); input.focus(); return;
      }
      input.removeAttribute('aria-invalid');
      if (status) status.textContent = 'Submitting your email…';
      if (button) { button.disabled = true; button.dataset.originalText = button.innerHTML; button.textContent = 'Subscribing…'; }
    });

    document.querySelectorAll('img[data-image-fallback]').forEach((image) => {
      image.addEventListener('error', () => {
        const fallback = image.dataset.imageFallback;
        if (fallback && image.src !== new URL(fallback, window.location.origin).href) image.src = fallback;
      }, { once: true });
    });
  });
})();
