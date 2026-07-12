document.addEventListener('DOMContentLoaded', () => {
  const siteHeader =
    document.getElementById('siteHeader');

const menuButton =
  document.getElementById('mobileMenuButton');

const navLinks =
  document.getElementById('navLinks');

function closeMobileMenu() {
  if (!menuButton || !navLinks) return;

  navLinks.classList.remove('active');
  menuButton.classList.remove('active');
  document.body.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
}

if (menuButton && navLinks) {
  menuButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    const isOpen =
      !navLinks.classList.contains('active');

    navLinks.classList.toggle('active', isOpen);
    menuButton.classList.toggle('active', isOpen);
    document.body.classList.toggle('menu-open', isOpen);

    menuButton.setAttribute(
      'aria-expanded',
      String(isOpen)
    );
  });

  navLinks.addEventListener('click', event => {
    event.stopPropagation();
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  document.addEventListener('click', closeMobileMenu);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMobileMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 950) {
      closeMobileMenu();
    }
  });
}

  window.addEventListener(
    'scroll',
    updateHeaderOnScroll,
    { passive: true }
  );

  updateHeaderOnScroll();

  const slides =
    Array.from(
      document.querySelectorAll('.hero-slide')
    );

  const dots =
    Array.from(
      document.querySelectorAll('.hero-dot')
    );

  const previousButton =
    document.querySelector('.hero-prev');

  const nextButton =
    document.querySelector('.hero-next');

  let currentSlide = 0;
  let sliderTimer;

  function showSlide(index) {
    if (!slides.length) return;

    currentSlide =
      (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle(
        'active',
        slideIndex === currentSlide
      );
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle(
        'active',
        dotIndex === currentSlide
      );
    });
  }

  function startSlider() {
    if (slides.length < 2) return;

    clearInterval(sliderTimer);

    sliderTimer = setInterval(() => {
      showSlide(currentSlide + 1);
    }, 6000);
  }

  previousButton?.addEventListener('click', () => {
    showSlide(currentSlide - 1);
    startSlider();
  });

  nextButton?.addEventListener('click', () => {
    showSlide(currentSlide + 1);
    startSlider();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      startSlider();
    });
  });

  showSlide(0);
  startSlider();

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
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              revealObserver.unobserve(
                entry.target
              );
            }
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
});
