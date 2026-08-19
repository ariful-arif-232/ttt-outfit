(() => {
  'use strict';

  const initPremiumNavigation = () => {
    const drawer = document.getElementById('tttDrawer');
    const menuTrigger = document.querySelector('.ttt-menu-trigger');

    if (!drawer || !menuTrigger) return;

    // Add semantic styling hooks without changing the existing menu data/markup.
    drawer.querySelectorAll('.ttt-drawer-group').forEach((group) => {
      const label = String(
        group.querySelector('.ttt-drawer-group-toggle > span:first-child')?.textContent || ''
      ).toLowerCase();

      group.classList.toggle('is-top-wear', label.includes('top wear'));
      group.classList.toggle('is-bottom-wear', label.includes('bottom wear'));
      group.classList.toggle('is-outer-wear', label.includes('outer wear'));
    });

    const markPointerOpen = () => {
      drawer.classList.add('is-pointer-open');
    };

    const markKeyboardOpen = () => {
      drawer.classList.remove('is-pointer-open');
    };

    menuTrigger.addEventListener('pointerdown', markPointerOpen, { passive: true });
    menuTrigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        markKeyboardOpen();
      }
    });

    // Existing accessible drawer logic focuses the first link on open. On touch devices
    // Safari can render that programmatic focus as a persistent selected-looking ring.
    // Blur only pointer-opened drawers; keyboard-opened drawers keep full focus behavior.
    menuTrigger.addEventListener('click', () => {
      window.setTimeout(() => {
        if (!drawer.classList.contains('is-pointer-open')) return;
        const focused = drawer.querySelector(':focus');
        if (focused instanceof HTMLElement) focused.blur();
      }, 0);
    });

    drawer.addEventListener('keydown', markKeyboardOpen);

    drawer.querySelectorAll('[data-drawer-close], a[href]').forEach((element) => {
      element.addEventListener('click', () => {
        window.setTimeout(() => drawer.classList.remove('is-pointer-open'), 220);
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPremiumNavigation, { once: true });
  } else {
    initPremiumNavigation();
  }
})();
