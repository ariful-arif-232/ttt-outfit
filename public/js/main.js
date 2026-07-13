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
});
