document.addEventListener('DOMContentLoaded', () => {
  const menuButton =
    document.getElementById('mobileMenuButton');

  const navLinks =
    document.getElementById('navLinks');

  if (menuButton && navLinks) {
    menuButton.addEventListener('click', () => {
      menuButton.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuButton.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  const slides =
    Array.from(document.querySelectorAll('.hero-slide'));

  const dots =
    Array.from(document.querySelectorAll('.hero-dot'));

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
              revealObserver.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.12
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
