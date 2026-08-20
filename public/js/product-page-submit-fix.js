(() => {
  'use strict';

  const FORM_ID = 'productCartForm';
  let purchaseIntent = 'cart';
  let submitting = false;

  const injectCompactProductStyles = () => {
    if (document.getElementById('ttt-product-submit-fix-styles')) return;

    const style = document.createElement('style');
    style.id = 'ttt-product-submit-fix-styles';
    style.textContent = `
      .professional-product-page .product-detail-info > h1 {
        font-size: clamp(34px, 4vw, 46px) !important;
        line-height: 1 !important;
        margin: 8px 0 9px !important;
        letter-spacing: -0.02em !important;
      }

      .professional-product-page .product-social-proof {
        gap: 6px !important;
        margin-bottom: 12px !important;
      }

      .professional-product-page .product-detail-rating,
      .professional-product-page .ttt-product-discount-chip {
        min-height: 30px !important;
        padding: 5px 9px !important;
        gap: 4px !important;
        border-radius: 999px !important;
        box-shadow: 0 4px 12px rgba(8, 42, 35, 0.055) !important;
      }

      .professional-product-page .product-detail-rating .rating-star {
        font-size: 13px !important;
      }

      .professional-product-page .product-detail-rating strong {
        font-size: 12px !important;
      }

      .professional-product-page .ttt-product-discount-chip {
        font-size: 10px !important;
        letter-spacing: 0.055em !important;
      }

      @media (max-width: 700px) {
        .professional-product-page .product-detail-info > h1 {
          font-size: clamp(30px, 8.2vw, 36px) !important;
          margin: 7px 0 8px !important;
        }

        .professional-product-page .product-detail-rating,
        .professional-product-page .ttt-product-discount-chip {
          min-height: 28px !important;
          padding: 4px 8px !important;
        }
      }
    `;

    document.head.appendChild(style);
  };

  const getForm = () => document.getElementById(FORM_ID);

  const selectedValue = (id) =>
    String(document.getElementById(id)?.value || '').trim();

  const focusMissingSelection = () => {
    const color = selectedValue('selectedColor');
    const size = selectedValue('selectedSize');

    const target = !color
      ? document.querySelector('.professional-product-page .product-color-option')
      : !size
        ? document.querySelector('.professional-product-page .product-size-option:not(:disabled)')
        : null;

    target?.focus();
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const setBusy = (busy) => {
    const addButton = document.getElementById('productAddButton');
    const buyButton = document.getElementById('productBuyNowButton');

    submitting = busy;

    if (addButton) {
      addButton.disabled = busy || !selectedValue('selectedColor') || !selectedValue('selectedSize');
      addButton.setAttribute('aria-busy', String(busy));
    }

    if (buyButton) {
      buyButton.disabled = busy || !selectedValue('selectedColor') || !selectedValue('selectedSize');
      buyButton.setAttribute('aria-busy', String(busy));
    }
  };

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('#productAddButton');
    const buyButton = event.target.closest('#productBuyNowButton');

    if (buyButton) {
      purchaseIntent = 'checkout';
    } else if (addButton) {
      purchaseIntent = 'cart';
    }
  }, true);

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== FORM_ID) return;

    event.preventDefault();
    event.stopPropagation();

    if (submitting) return;

    const submitter = event.submitter;
    const intent = submitter?.id === 'productBuyNowButton'
      ? 'checkout'
      : submitter?.id === 'productAddButton'
        ? 'cart'
        : purchaseIntent;

    const color = selectedValue('selectedColor');
    const size = selectedValue('selectedSize');

    if (!color || !size) {
      focusMissingSelection();
      return;
    }

    setBusy(true);

    try {
      const body = new FormData(form);
      body.delete('redirectTo');

      const response = await fetch(form.action, {
        method: 'POST',
        body,
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json'
        }
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Could not add this product to cart.');
      }

      if (intent === 'checkout') {
        window.location.assign('/checkout');
        return;
      }

      const nextUrl = `${window.location.pathname}${window.location.search}`;
      window.location.replace(nextUrl);
    } catch (error) {
      setBusy(false);
      window.alert(error?.message || 'Could not add this product to cart. Please try again.');
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCompactProductStyles, { once: true });
  } else {
    injectCompactProductStyles();
  }
})();
