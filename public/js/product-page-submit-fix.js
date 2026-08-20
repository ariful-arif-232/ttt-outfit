(() => {
  'use strict';

  if (window.__tttProductPageSubmitFixLoaded) return;
  window.__tttProductPageSubmitFixLoaded = true;

  const FORM_ID = 'productCartForm';
  let purchaseIntent = 'cart';
  let submitting = false;

  const selectedValue = (id) =>
    String(document.getElementById(id)?.value || '').trim();

  const readCurrentProduct = () => {
    try {
      return JSON.parse(
        document.getElementById('currentProductData')?.textContent || '{}'
      );
    } catch {
      return {};
    }
  };

  const showPurchaseError = (message) => {
    const notice = document.getElementById('productStockNotice');
    if (!notice) return;
    notice.textContent = String(message || 'Could not complete this action. Please try again.');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
  };

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
      addButton.disabled =
        busy ||
        !selectedValue('selectedColor') ||
        !selectedValue('selectedSize');
      addButton.setAttribute('aria-busy', String(busy));
    }

    if (buyButton) {
      buyButton.disabled =
        busy ||
        !selectedValue('selectedColor') ||
        !selectedValue('selectedSize');
      buyButton.setAttribute('aria-busy', String(busy));
    }
  };

  const escapeHtml = (value) =>
    String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));

  const moneyText = (value) =>
    `৳${Number(value || 0).toLocaleString('en-BD')}`;

  const renderAndOpenMiniCart = (cart) => {
    const drawer = document.querySelector('[data-cart-drawer]');
    const backdrop = document.querySelector('[data-cart-drawer-backdrop]');
    const itemsContainer = document.querySelector('[data-cart-drawer-items]');
    const emptyState = document.querySelector('[data-cart-drawer-empty]');
    const footer = document.querySelector('[data-cart-drawer-footer]');
    const subtotal = document.querySelector('[data-cart-drawer-subtotal]');
    const drawerCount = document.querySelector('[data-cart-drawer-count]');
    const countBadges = document.querySelectorAll('[data-cart-count]');

    if (!drawer || !backdrop || !cart) return false;

    const items = Array.isArray(cart.items) ? cart.items : [];
    const count = Number(cart.count || 0);

    countBadges.forEach((badge) => {
      badge.textContent = String(count);
      badge.style.display = count > 0 ? 'flex' : 'none';
    });

    if (drawerCount) drawerCount.textContent = `(${count})`;
    if (subtotal) subtotal.textContent = moneyText(cart.subtotal);

    if (!items.length) {
      if (itemsContainer) itemsContainer.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      if (footer) footer.hidden = true;
    } else {
      if (emptyState) emptyState.hidden = true;
      if (footer) footer.hidden = false;

      if (itemsContainer) {
        itemsContainer.innerHTML = items.map((item) => `
          <article class="ttt-cart-drawer-item" data-cart-item data-index="${Number(item.index)}">
            <img src="${escapeHtml(item.image || '/ttt-logo.jpeg')}" alt="${escapeHtml(item.name)}">
            <div class="ttt-cart-drawer-item-info">
              <h4>${escapeHtml(item.name)}</h4>
              <p class="ttt-cart-drawer-item-meta">Size: ${escapeHtml(item.size || 'One Size')} · Color: ${escapeHtml(item.color || 'Default')}</p>
              <div class="ttt-cart-drawer-qty">
                <button type="button" data-cart-qty-minus data-index="${Number(item.index)}" aria-label="Decrease quantity">−</button>
                <span>${Number(item.quantity || 0)}</span>
                <button type="button" data-cart-qty-plus data-index="${Number(item.index)}" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <div class="ttt-cart-drawer-item-side">
              <strong>${moneyText(item.lineTotal)}</strong>
              <button type="button" class="ttt-cart-drawer-remove" data-cart-remove data-index="${Number(item.index)}" aria-label="Remove ${escapeHtml(item.name)}"><i class="bi bi-trash3"></i></button>
            </div>
          </article>
        `).join('');
      }
    }

    backdrop.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      drawer.classList.add('is-open');
      drawer.classList.add('is-just-added');
    });

    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ttt-cart-drawer-lock');

    window.setTimeout(() => {
      drawer.classList.remove('is-just-added');
    }, 1400);

    return true;
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
    event.stopImmediatePropagation();

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

    const currentProduct = readCurrentProduct();
    const hiddenProductId = String(
      form.querySelector('input[name="productId"]')?.value || ''
    ).trim();
    const productId = String(
      currentProduct.productId || hiddenProductId || ''
    ).trim();

    if (!productId) {
      showPurchaseError('Could not identify this product. Please refresh and try again.');
      return;
    }

    const quantity = String(
      Math.max(1, Number(selectedValue('productQuantity')) || 1)
    );

    setBusy(true);

    try {
      const params = new URLSearchParams({
        productId,
        color,
        size,
        quantity
      });

      const endpoint = new URL(form.action, window.location.origin);
      endpoint.searchParams.set('productId', productId);

      const response = await fetch(endpoint.toString(), {
        method: 'POST',
        body: params.toString(),
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'X-TTT-Product-Id': productId,
          Accept: 'application/json'
        }
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ||
          'Could not add this product to cart.'
        );
      }

      if (intent === 'checkout') {
        window.location.assign('/checkout');
        return;
      }

      renderAndOpenMiniCart(payload.cart);
      setBusy(false);
      purchaseIntent = 'cart';
    } catch (error) {
      setBusy(false);
      showPurchaseError(
        error?.message ||
        'Could not add this product to cart. Please try again.'
      );
    }
  }, true);
})();

/*
  Final product-selection/wholesale presentation guard.
  The legacy product template still initializes its first variant, so this
  controller runs after the existing handlers and keeps the final state explicit:
  no default color/size choice, no accidental purchase-ready state, and the
  compact wholesale copy requested by the storefront UI.
*/
(() => {
  'use strict';

  if (window.__tttFinalProductUiGuardLoaded) return;
  window.__tttFinalProductUiGuardLoaded = true;

  const page = document.querySelector('.professional-product-page');
  if (!page) return;

  const colorInput = document.getElementById('selectedColor');
  const colorLabel = document.getElementById('selectedColorLabel');
  const sizeInput = document.getElementById('selectedSize');
  const sizeOptions = document.getElementById('productSizeOptions');
  const stockText = document.getElementById('variantStockText');
  const stockDot = document.getElementById('variantStockDot');
  const stockProgress = document.getElementById('productStockProgress');
  const addButton = document.getElementById('productAddButton');
  const buyButton = document.getElementById('productBuyNowButton');
  const quantityInput = document.getElementById('productQuantity');

  let variants = [];
  try {
    variants = JSON.parse(
      document.getElementById('productVariantData')?.textContent || '[]'
    );
  } catch {
    variants = [];
  }

  const colorButtons = () =>
    [...page.querySelectorAll('.product-color-option')];

  const sizeButtons = () =>
    [...(sizeOptions?.querySelectorAll('.product-size-option') || [])];

  const selectedStock = () => {
    const selectedButton = colorButtons().find((button) =>
      button.classList.contains('active') ||
      button.getAttribute('aria-pressed') === 'true'
    );

    const variantIndex = Number(selectedButton?.dataset.variantIndex);
    return Number(variants[variantIndex]?.stock || 0);
  };

  const setPurchaseEnabled = (enabled) => {
    if (addButton) {
      addButton.disabled = !enabled;
      addButton.setAttribute('aria-disabled', String(!enabled));
    }

    if (buyButton) {
      buyButton.disabled = !enabled;
      buyButton.setAttribute('aria-disabled', String(!enabled));
    }
  };

  const resetInitialSelection = () => {
    if (colorInput) colorInput.value = '';
    if (sizeInput) sizeInput.value = '';
    if (colorLabel) colorLabel.textContent = 'Select a color';

    colorButtons().forEach((button) => {
      button.classList.remove('active');
      button.setAttribute('aria-pressed', 'false');
    });

    sizeButtons().forEach((button) => {
      button.classList.remove('active');
      button.disabled = true;
      button.setAttribute('aria-pressed', 'false');
    });

    if (stockText) stockText.textContent = 'Select color';
    if (stockProgress) stockProgress.style.width = '0%';

    if (stockDot) {
      stockDot.classList.remove('out-of-stock');
      stockDot.style.opacity = '0.42';
    }

    setPurchaseEnabled(false);
  };

  const clearAutoSelectedSize = () => {
    if (sizeInput) sizeInput.value = '';

    const outOfStock = selectedStock() < 1;

    sizeButtons().forEach((button) => {
      button.classList.remove('active');
      button.disabled = outOfStock;
      button.setAttribute('aria-pressed', 'false');
    });

    setPurchaseEnabled(false);
  };

  const readWholesaleData = () => {
    try {
      return JSON.parse(
        document.getElementById('productWholesaleData')?.textContent || 'null'
      );
    } catch {
      return null;
    }
  };

  const updateWholesaleCopy = () => {
    const panel = document.getElementById('tttProductWholesaleCard');
    const message = panel?.querySelector('[data-wholesale-message]');
    const badge = panel?.querySelector('[data-wholesale-badge]');
    const data = readWholesaleData();

    if (!panel || !message || !data) return;

    const retailPrice = Number(data.retailPrice || 0);
    const wholesalePrice = Number(data.wholesalePrice || 0);
    const minimumQuantity = Math.max(1, Number(data.minimumQuantity || 1));

    if (
      retailPrice <= 0 ||
      wholesalePrice <= 0 ||
      wholesalePrice >= retailPrice ||
      minimumQuantity <= 1
    ) {
      return;
    }

    const quantity = Math.max(1, Number(quantityInput?.value || 1));
    const remaining = Math.max(0, minimumQuantity - quantity);
    const reached = quantity >= minimumQuantity;

    panel.classList.toggle('is-active', reached);
    message.textContent = reached
      ? 'Wholesale active'
      : `Add ${remaining} more ${remaining === 1 ? 'pc' : 'pcs'}`;

    if (badge) {
      badge.textContent = reached ? 'Active' : `${minimumQuantity}+ pcs`;
    }
  };

  /* Clear server/legacy defaults immediately, then once more after all
     DOMContentLoaded product handlers have completed. */
  resetInitialSelection();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      resetInitialSelection();
      updateWholesaleCopy();
    }, { once: true });
  } else {
    resetInitialSelection();
    updateWholesaleCopy();
  }

  document.addEventListener('click', (event) => {
    const colorButton = event.target.closest(
      '.professional-product-page .product-color-option'
    );

    if (colorButton) {
      window.setTimeout(() => {
        clearAutoSelectedSize();
        updateWholesaleCopy();
      }, 0);
      return;
    }

    const sizeButton = event.target.closest(
      '.professional-product-page .product-size-option'
    );

    if (sizeButton) {
      window.setTimeout(() => {
        const ready = Boolean(
          String(colorInput?.value || '').trim() &&
          String(sizeInput?.value || '').trim() &&
          selectedStock() > 0 &&
          !sizeButton.disabled
        );
        setPurchaseEnabled(ready);
      }, 0);
      return;
    }

    if (
      event.target.closest('#decreaseQuantity') ||
      event.target.closest('#increaseQuantity')
    ) {
      window.setTimeout(updateWholesaleCopy, 0);
    }
  });

  quantityInput?.addEventListener('input', updateWholesaleCopy);
  quantityInput?.addEventListener('change', updateWholesaleCopy);
})();
