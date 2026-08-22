(() => {
  'use strict';

  // Disable the legacy delayed popup opener before DOMContentLoaded fires.
  // The new square popup below controls the only open-on-entry behavior.
  try {
    sessionStorage.setItem('tttSitePopupShown', '1');
  } catch {
    // Continue normally when sessionStorage is unavailable.
  }

  const initSquarePopup = () => {
    const modal = document.getElementById('siteOfferModal');
    if (!modal) return;

    const imageLink = modal.querySelector('.site-offer-image-link');
    const cta = modal.querySelector('.offer-shop-button');

    if (imageLink) {
      imageLink.removeAttribute('href');
      imageLink.removeAttribute('target');
      imageLink.setAttribute('tabindex', '-1');
      imageLink.setAttribute('aria-disabled', 'true');
    }

    cta?.remove();

    // Fresh key lets visitors see the redesigned square popup once.
    const storageKey = 'tttSiteSquarePopupShownV1';
    let alreadyShown = false;

    try {
      alreadyShown = sessionStorage.getItem(storageKey) === '1';
    } catch {
      alreadyShown = false;
    }

    if (!alreadyShown) {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('offer-modal-open');

      try {
        sessionStorage.setItem(storageKey, '1');
      } catch {
        // Popup still works when sessionStorage is unavailable.
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSquarePopup, { once: true });
  } else {
    initSquarePopup();
  }
})();
