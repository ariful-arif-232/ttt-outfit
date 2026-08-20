(() => {
  'use strict';

  const FORM_ID = 'productCartForm';
  let purchaseIntent = 'cart';
  let submitting = false;

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
      const params = new URLSearchParams();
      const formData = new FormData(form);

      formData.forEach((value, key) => {
        if (key === 'redirectTo') return;
        if (typeof value === 'string') params.append(key, value);
      });

      const response = await fetch(form.action, {
        method: 'POST',
        body: params.toString(),
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
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

      window.location.replace(`${window.location.pathname}${window.location.search}`);
    } catch (error) {
      setBusy(false);
      window.alert(error?.message || 'Could not add this product to cart. Please try again.');
    }
  }, true);
})();
