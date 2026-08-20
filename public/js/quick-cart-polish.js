(() => {
  'use strict';

  const initQuickCartPolish = () => {
    const drawer = document.querySelector('[data-quick-cart-drawer]');
    const form = document.querySelector('[data-quick-cart-form]');
    if (!drawer || !form) return;

    const colorInput = form.querySelector('[data-drawer-color]');
    const sizeInput = form.querySelector('[data-drawer-size]');
    const colorWrap = drawer.querySelector('[data-drawer-color-wrap]');
    const sizeWrap = drawer.querySelector('[data-drawer-size-wrap]');
    const colorChoices = () => [...drawer.querySelectorAll('[data-drawer-colors] .ttt-drawer-choice')];
    const sizeChoices = () => [...drawer.querySelectorAll('[data-drawer-sizes] .ttt-drawer-choice')];
    const submitButton = form.querySelector('.ttt-drawer-submit, button[type="submit"]');
    const productImage = drawer.querySelector('[data-drawer-image]');
    const ratingDetail = drawer.querySelector('.ttt-drawer-rating small');

    if (productImage) {
      productImage.draggable = false;
      productImage.addEventListener('dragstart', (event) => event.preventDefault());
    }

    const needsColor = () => Boolean(colorWrap && !colorWrap.hidden && colorChoices().length);
    const needsSize = () => Boolean(sizeWrap && !sizeWrap.hidden && sizeChoices().length);

    const updateSubmitState = () => {
      if (!submitButton) return;
      const colorReady = !needsColor() || Boolean(String(colorInput?.value || '').trim());
      const sizeReady = !needsSize() || Boolean(String(sizeInput?.value || '').trim());
      submitButton.disabled = !(colorReady && sizeReady);
      submitButton.setAttribute('aria-disabled', String(submitButton.disabled));
    };

    const clearSizeSelection = () => {
      sizeChoices().forEach((choice) => choice.classList.remove('is-active'));
      if (sizeInput) sizeInput.value = '';
      updateSubmitState();
    };

    const clearAllSelection = () => {
      colorChoices().forEach((choice) => choice.classList.remove('is-active'));
      sizeChoices().forEach((choice) => choice.classList.remove('is-active'));
      if (colorInput) colorInput.value = '';
      if (sizeInput) sizeInput.value = '';
      updateSubmitState();
    };

    const updateReviewDetail = (trigger) => {
      if (!ratingDetail) return;

      let reviewCount = 0;
      try {
        const product = JSON.parse(trigger?.dataset.product || '{}');
        reviewCount = Number(product.reviewCount || 0);
      } catch {
        reviewCount = 0;
      }

      if (reviewCount > 0) {
        ratingDetail.style.setProperty('display', 'inline', 'important');
      } else {
        ratingDetail.style.setProperty('display', 'none', 'important');
      }
    };

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-quick-cart-trigger]');
      if (trigger) {
        updateReviewDetail(trigger);
        window.setTimeout(clearAllSelection, 0);
        return;
      }

      const colorChoice = event.target.closest('[data-drawer-colors] .ttt-drawer-choice');
      if (colorChoice && drawer.contains(colorChoice)) {
        window.setTimeout(() => {
          clearSizeSelection();
          updateSubmitState();
        }, 0);
        return;
      }

      const sizeChoice = event.target.closest('[data-drawer-sizes] .ttt-drawer-choice');
      if (sizeChoice && drawer.contains(sizeChoice)) {
        window.setTimeout(updateSubmitState, 0);
      }
    });

    form.addEventListener('submit', (event) => {
      updateSubmitState();
      if (submitButton?.disabled) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const firstMissing = needsColor() && !String(colorInput?.value || '').trim()
          ? colorWrap
          : needsSize() && !String(sizeInput?.value || '').trim()
            ? sizeWrap
            : null;

        firstMissing?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, true);

    drawer.addEventListener('dblclick', (event) => {
      event.preventDefault();
    }, { passive: false });

    drawer.addEventListener('touchend', (event) => {
      if (event.touches?.length > 1) event.preventDefault();
    }, { passive: false });

    updateSubmitState();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickCartPolish, { once: true });
  } else {
    initQuickCartPolish();
  }
})();

/*
  Product detail final UI layer.
  The final wholesale/availability stylesheet is loaded here with its own
  cache key so product pages always receive the latest polished layout.
*/
(() => {
  'use strict';

  const finalStyleId = 'tttWholesaleFinalUiStyle';
  if (!document.getElementById(finalStyleId)) {
    const link = document.createElement('link');
    link.id = finalStyleId;
    link.rel = 'stylesheet';
    link.href = '/css/wholesale-final-ui.css?v=20260821-2';
    document.head.appendChild(link);
  }

  const page = document.querySelector('.professional-product-page');
  if (!page || window.__tttProductDetailFinalLoaded) return;
  window.__tttProductDetailFinalLoaded = true;

  const form = document.getElementById('productCartForm');
  const colorInput = document.getElementById('selectedColor');
  const colorLabel = document.getElementById('selectedColorLabel');
  const sizeInput = document.getElementById('selectedSize');
  const sizeOptions = document.getElementById('productSizeOptions');
  const addButton = document.getElementById('productAddButton');
  const buyNowButton = document.getElementById('productBuyNowButton');
  const stockText = document.getElementById('variantStockText');
  const stockProgress = document.getElementById('productStockProgress');
  const stockDot = document.getElementById('variantStockDot');
  const stockPanel = page.querySelector('.product-stock-panel');
  const mainImage = document.getElementById('productMainImage');
  const sizeGuideOpen = document.getElementById('sizeGuideOpen');
  const quantityInput = document.getElementById('productQuantity');
  const colorButtons = [...page.querySelectorAll('.product-color-option')];

  let variants = [];
  try {
    variants = JSON.parse(
      document.getElementById('productVariantData')?.textContent || '[]'
    );
  } catch {
    variants = [];
  }

  let selectedVariant = null;

  const currentSizeButtons = () =>
    [...(sizeOptions?.querySelectorAll('.product-size-option') || [])];

  const hasColorSelection = () =>
    Boolean(String(colorInput?.value || '').trim());

  const hasSizeSelection = () =>
    Boolean(String(sizeInput?.value || '').trim());

  const selectedStock = () => Number(selectedVariant?.stock || 0);

  const updatePurchaseState = () => {
    const readyToBuy =
      hasColorSelection() && hasSizeSelection() && selectedStock() > 0;

    if (addButton) {
      addButton.disabled = !readyToBuy;
      addButton.setAttribute('aria-disabled', String(!readyToBuy));
    }

    if (buyNowButton) {
      buyNowButton.disabled = !readyToBuy;
      buyNowButton.setAttribute('aria-disabled', String(!readyToBuy));
    }
  };

  const clearSizeSelection = ({ disable = false } = {}) => {
    if (sizeInput) sizeInput.value = '';

    currentSizeButtons().forEach((button) => {
      button.classList.remove('active');
      button.disabled = disable;
      button.setAttribute('aria-pressed', 'false');
    });

    updatePurchaseState();
  };

  const sizeGroup = sizeOptions?.closest('.product-option-group') || null;
  const sizeHeading = sizeGroup?.querySelector('.product-option-heading') || null;

  /* Final size + availability structure is applied once, before DOMContentLoaded. */
  if (sizeGroup && sizeOptions && stockPanel) {
    sizeGroup.classList.add('product-size-group');
    sizeHeading?.classList.add('product-size-heading');

    let layout = sizeGroup.querySelector(':scope > .product-size-availability-layout');
    if (!layout) {
      layout = document.createElement('div');
      layout.className = 'product-size-availability-layout';
      sizeOptions.parentNode.insertBefore(layout, sizeOptions);
      layout.append(sizeOptions, stockPanel);
    }

    stockPanel.classList.remove('product-stock-panel');
    stockPanel.classList.add('product-availability-box');
    stockPanel.setAttribute('aria-label', 'Selected color availability');
  }

  const initFinalUi = () => {
    /* Compact rating row and actual saved-money chip. */
    const socialProof = page.querySelector('.product-social-proof');
    socialProof?.querySelector('.product-detail-rating small')?.remove();
    socialProof?.querySelector('.product-sold-proof')?.remove();
    socialProof?.querySelector('.product-viewing-proof')?.remove();

    const savingPill = page.querySelector('.product-price-saving');
    const savingText = String(savingPill?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
    savingPill?.remove();

    if (
      socialProof &&
      savingText &&
      !socialProof.querySelector('.ttt-product-discount-chip')
    ) {
      const discountChip = document.createElement('span');
      discountChip.className = 'ttt-product-discount-chip ttt-product-save-chip';
      discountChip.textContent = savingText;
      socialProof.appendChild(discountChip);
    }

    /* Product-specific wholesale offer from Admin > Products. */
    let wholesaleData = null;
    try {
      wholesaleData = JSON.parse(
        document.getElementById('productWholesaleData')?.textContent || 'null'
      );
    } catch {
      wholesaleData = null;
    }

    const retailPrice = Number(wholesaleData?.retailPrice || 0);
    const wholesalePrice = Number(wholesaleData?.wholesalePrice || 0);
    const minimumQuantity = Math.max(1, Number(wholesaleData?.minimumQuantity || 1));

    if (
      retailPrice > 0 &&
      wholesalePrice > 0 &&
      wholesalePrice < retailPrice &&
      minimumQuantity > 1 &&
      !document.getElementById('tttProductWholesaleCard')
    ) {
      const saveEach = Math.max(0, retailPrice - wholesalePrice);
      const wholesalePanel = document.createElement('aside');
      wholesalePanel.className = 'ttt-product-wholesale-card';
      wholesalePanel.id = 'tttProductWholesaleCard';
      wholesalePanel.setAttribute('aria-label', 'Wholesale offer');
      wholesalePanel.innerHTML = `
        <span class="ttt-product-wholesale-icon" aria-hidden="true">
          <i class="bi bi-box-seam"></i>
        </span>
        <span class="ttt-product-wholesale-copy">
          <small>WHOLESALE OFFER</small>
          <strong data-wholesale-message>ADD ${minimumQuantity} MORE PCS</strong>
          <span class="ttt-product-wholesale-detail">
            <span>Rate ৳${wholesalePrice.toLocaleString('en-BD')}</span>
            <span>Save ৳${saveEach.toLocaleString('en-BD')}</span>
          </span>
        </span>
      `;

      if (sizeGroup) {
        sizeGroup.insertAdjacentElement('afterend', wholesalePanel);
      } else {
        form?.querySelector('.product-buy-row')?.insertAdjacentElement('beforebegin', wholesalePanel);
      }

      const wholesaleMessage = wholesalePanel.querySelector('[data-wholesale-message]');

      const updateWholesaleCard = () => {
        const quantity = Math.max(1, Number(quantityInput?.value || 1));
        const remaining = Math.max(0, minimumQuantity - quantity);
        const reached = quantity >= minimumQuantity;

        wholesalePanel.classList.toggle('is-active', reached);

        if (wholesaleMessage) {
          wholesaleMessage.textContent = reached
            ? 'WHOLESALE ACTIVE'
            : `ADD ${remaining} MORE ${remaining === 1 ? 'PC' : 'PCS'}`;
        }
      };

      quantityInput?.addEventListener('input', updateWholesaleCard);
      quantityInput?.addEventListener('change', updateWholesaleCard);
      document.getElementById('decreaseQuantity')?.addEventListener(
        'click',
        () => window.setTimeout(updateWholesaleCard, 0)
      );
      document.getElementById('increaseQuantity')?.addEventListener(
        'click',
        () => window.setTimeout(updateWholesaleCard, 0)
      );

      updateWholesaleCard();
    }

    /* Delivery rows were redundant; compact trust badges remain. */
    page.querySelector('.product-delivery-panel')?.remove();

    if (sizeGuideOpen) {
      sizeGuideOpen.innerHTML = '<i class="bi bi-rulers" aria-hidden="true"></i><span>Size guide</span>';
    }

    const sizeGuideModal = document.getElementById('sizeGuideModal');
    const sizeGuideWrap = sizeGuideModal?.querySelector('.size-guide-table-wrap');
    const sizeGuideNote = sizeGuideModal?.querySelector('.size-guide-dialog > p');
    const categoryName = String(
      page.querySelector('.product-title-top .section-kicker')?.textContent || ''
    ).toLowerCase();

    const categoryGuide = /pant|trouser|jogger|bottom|quarter/.test(categoryName)
      ? 'bottom'
      : /hoodie|jacket|sweatshirt|outer/.test(categoryName)
        ? 'outer'
        : 'top';

    if (sizeGuideWrap) {
      sizeGuideWrap.innerHTML = `
        <div class="ttt-size-guide-tabs" role="tablist" aria-label="Size guide categories">
          <button class="ttt-size-guide-tab" type="button" role="tab" data-guide-tab="top">Top Wear</button>
          <button class="ttt-size-guide-tab" type="button" role="tab" data-guide-tab="bottom">Bottom Wear</button>
          <button class="ttt-size-guide-tab" type="button" role="tab" data-guide-tab="outer">Outer Wear</button>
        </div>
        <section class="ttt-size-guide-panel" data-guide-panel="top">
          <p class="ttt-size-guide-copy">T-shirts, polo shirts, shirts and tops — general chest guide.</p>
          <div class="ttt-size-guide-grid">
            <div class="ttt-size-guide-card"><strong>S</strong><span>36–38″ chest</span></div>
            <div class="ttt-size-guide-card"><strong>M</strong><span>38–40″ chest</span></div>
            <div class="ttt-size-guide-card"><strong>L</strong><span>40–42″ chest</span></div>
            <div class="ttt-size-guide-card"><strong>XL</strong><span>42–44″ chest</span></div>
            <div class="ttt-size-guide-card"><strong>XXL</strong><span>44–46″ chest</span></div>
          </div>
        </section>
        <section class="ttt-size-guide-panel" data-guide-panel="bottom">
          <p class="ttt-size-guide-copy">Pants, trousers and joggers — general waist guide.</p>
          <div class="ttt-size-guide-grid">
            <div class="ttt-size-guide-card"><strong>S</strong><span>28–30″ waist</span></div>
            <div class="ttt-size-guide-card"><strong>M</strong><span>30–32″ waist</span></div>
            <div class="ttt-size-guide-card"><strong>L</strong><span>32–34″ waist</span></div>
            <div class="ttt-size-guide-card"><strong>XL</strong><span>34–36″ waist</span></div>
            <div class="ttt-size-guide-card"><strong>XXL</strong><span>36–38″ waist</span></div>
          </div>
        </section>
        <section class="ttt-size-guide-panel" data-guide-panel="outer">
          <p class="ttt-size-guide-copy">Hoodies, sweatshirts and jackets — general layering chest guide.</p>
          <div class="ttt-size-guide-grid">
            <div class="ttt-size-guide-card"><strong>S</strong><span>38–40″ chest</span></div>
            <div class="ttt-size-guide-card"><strong>M</strong><span>40–42″ chest</span></div>
            <div class="ttt-size-guide-card"><strong>L</strong><span>42–44″ chest</span></div>
            <div class="ttt-size-guide-card"><strong>XL</strong><span>44–46″ chest</span></div>
            <div class="ttt-size-guide-card"><strong>XXL</strong><span>46–48″ chest</span></div>
          </div>
        </section>
      `;

      const setGuide = (guide) => {
        sizeGuideWrap.querySelectorAll('[data-guide-tab]').forEach((button) => {
          const active = button.dataset.guideTab === guide;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-selected', String(active));
        });

        sizeGuideWrap.querySelectorAll('[data-guide-panel]').forEach((panel) => {
          panel.classList.toggle('is-active', panel.dataset.guidePanel === guide);
        });
      };

      sizeGuideWrap.addEventListener('click', (event) => {
        const button = event.target.closest('[data-guide-tab]');
        if (button) setGuide(button.dataset.guideTab);
      });

      setGuide(categoryGuide);
    }

    if (sizeGuideNote) {
      sizeGuideNote.textContent =
        'General fit guide only. The selectable sizes shown on each product are the final available options for that item.';
    }

    /* Legacy product script preselects variant 0. Final UI requires an explicit choice. */
    selectedVariant = null;
    if (colorInput) colorInput.value = '';
    if (sizeInput) sizeInput.value = '';
    if (colorLabel) colorLabel.textContent = 'Select a color';

    colorButtons.forEach((button) => {
      button.classList.remove('active');
      button.setAttribute('aria-pressed', 'false');
    });

    clearSizeSelection({ disable: true });

    if (stockText) stockText.textContent = 'Select color';
    if (stockProgress) stockProgress.style.width = '0%';
    if (stockDot) {
      stockDot.classList.remove('out-of-stock');
      stockDot.style.opacity = '0.42';
    }

    updatePurchaseState();

    document.addEventListener('click', (event) => {
      const colorButton = event.target.closest('.professional-product-page .product-color-option');
      if (colorButton) {
        const variantIndex = Number(colorButton.dataset.variantIndex);
        selectedVariant = variants[variantIndex] || null;

        colorButtons.forEach((button) => {
          button.setAttribute('aria-pressed', String(button === colorButton));
        });

        if (stockDot) stockDot.style.opacity = '';
        clearSizeSelection({ disable: false });
        return;
      }

      const sizeButton = event.target.closest('.professional-product-page .product-size-option');
      if (sizeButton) {
        currentSizeButtons().forEach((button) => {
          button.setAttribute('aria-pressed', String(button === sizeButton));
        });
        updatePurchaseState();
      }
    });

    form?.addEventListener('submit', (event) => {
      updatePurchaseState();
      if (!hasColorSelection() || !hasSizeSelection() || selectedStock() < 1) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const focusTarget = !hasColorSelection()
          ? colorButtons[0]
          : !hasSizeSelection()
            ? currentSizeButtons()[0]
            : null;

        focusTarget?.focus();
        focusTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, true);

    mainImage?.addEventListener('click', (event) => {
      if (window.matchMedia('(max-width: 950px)').matches) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    page.addEventListener('dblclick', (event) => {
      event.preventDefault();
    }, { passive: false });

    let lastTouchEnd = 0;
    page.addEventListener('touchend', (event) => {
      const now = Date.now();
      const isInteractive = Boolean(
        event.target.closest('button, a, input, .product-main-image-wrap, .product-option-group')
      );

      if (isInteractive && now - lastTouchEnd < 320) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFinalUi, { once: true });
  } else {
    initFinalUi();
  }
})();