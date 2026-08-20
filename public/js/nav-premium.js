(() => {
  'use strict';

  const initPremiumNavigation = () => {
    const drawer = document.getElementById('tttDrawer');
    const menuTrigger = document.querySelector('.ttt-menu-trigger');

    if (!drawer || !menuTrigger) return;

    const drawerHead = drawer.querySelector('.ttt-drawer-head');
    const drawerAccount = drawer.querySelector('.ttt-drawer-account');
    const closeButton = drawerHead?.querySelector('[data-drawer-close]');

    // Keep the top bar compact: a simple MENU label on the left and close button on the right.
    if (drawerHead && !drawerHead.querySelector('.ttt-drawer-title')) {
      const title = document.createElement('div');
      title.className = 'ttt-drawer-title';
      title.textContent = 'Menu';
      drawerHead.insertBefore(title, closeButton || drawerHead.firstChild);
    }

    // Logged-out Login/Register used to consume the whole top row.
    // Move them to the account area at the bottom, where Logout appears for logged-in users.
    const authRow = drawer.querySelector('.ttt-drawer-auth-row-top');
    if (authRow && drawerAccount) {
      authRow.classList.remove('ttt-drawer-auth-row-top');
      authRow.classList.add('ttt-drawer-auth-bottom');
      drawerAccount.appendChild(authRow);
    }

    const logoutLink = drawerAccount?.querySelector('a[href="/logout"]');
    logoutLink?.classList.add('ttt-drawer-logout-button');

    // Add semantic styling hooks without changing category data or links.
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

    // Existing drawer logic focuses the first control on open. On touch Safari this can
    // look like a persistent selected pill, so blur only pointer-opened drawers.
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
