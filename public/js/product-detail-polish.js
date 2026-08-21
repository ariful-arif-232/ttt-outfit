(() => {
  'use strict';

  if (window.__tttProductDetailPolishLoaded) return;
  window.__tttProductDetailPolishLoaded = true;

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  ready(() => {
    const page = document.querySelector('.professional-product-page');
    if (!page) return;

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
    const stockNotice = document.getElementById('productStockNotice');
    const stockPanel = page.querySelector('.product-stock-panel');
    const mainImage = document.getElementById('productMainImage');
    const sizeGuideOpen = document.getElementById('sizeGuideOpen');
    const quantityInput = document.getElementById('productQuantity');
    const decreaseQuantity = document.getElementById('decreaseQuantity');
    const increaseQuantity = document.getElementById('increaseQuantity');
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
    let selectedSizeState = '';
    let selectionTouched = false;

    const normalizeSize = (value) => String(value || '').trim();

    const variantSizes = (variant) => {
      const sizes = Array.isArray(variant?.sizes) && variant.sizes.length
        ? variant.sizes
        : ['One Size'];

      return [...new Set(sizes.map(normalizeSize).filter(Boolean))];
    };

    const allUniqueSizes = () => {
      const sizes = variants.flatMap((variant) => variantSizes(variant));
      return [...new Set(sizes.map(normalizeSize).filter(Boolean))];
    };

    const currentSizeButtons = () =>
      [...(sizeOptions?.querySelectorAll('.product-size-option') || [])];

    const hasColorSelection = () =>
      Boolean(String(colorInput?.value || '').trim());

    const hasSizeSelection = () =>
      Boolean(String(sizeInput?.value || '').trim());

    const selectedStock = () => Number(selectedVariant?.stock || 0);

    const updatePurchaseState = () => {
      const readyToBuy =
        hasColorSelection() &&
        hasSizeSelection() &&
        selectedStock() > 0;

      if (addButton) {
        addButton.disabled = !readyToBuy;
        addButton.setAttribute('aria-disabled', String(!readyToBuy));

        if (selectedVariant && selectedStock() < 1) {
          addButton.textContent = 'Out of stock';
        } else {
          addButton.textContent = 'Add to cart';
        }
      }

      if (buyNowButton) {
        buyNowButton.disabled = !readyToBuy;
        buyNowButton.setAttribute('aria-disabled', String(!readyToBuy));
      }
    };

    const renderSizeOptions = (
      sizes,
      { selected = '', disabled = false } = {}
    ) => {
      if (!sizeOptions || !sizeInput) return;

      const normalizedSizes = [...new Set(
        (sizes || []).map(normalizeSize).filter(Boolean)
      )];

      const validSelected = normalizedSizes.includes(normalizeSize(selected))
        ? normalizeSize(selected)
        : '';

      selectedSizeState = validSelected;
      sizeInput.value = validSelected;
      sizeOptions.innerHTML = '';

      normalizedSizes.forEach((size) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-size-option';
        button.dataset.size = size;
        button.textContent = size;
        button.disabled = Boolean(disabled);
        button.classList.toggle('active', size === validSelected);
        button.setAttribute('aria-pressed', String(size === validSelected));
        button.setAttribute('aria-label', `Select size ${size}`);
        sizeOptions.appendChild(button);
      });

      updatePurchaseState();
    };

    const updateStockState = (variant) => {
      const stock = Number(variant?.stock || 0);

      if (!variant) {
        if (stockText) stockText.textContent = 'Select color';
        if (stockProgress) stockProgress.style.width = '0%';
        if (stockDot) {
          stockDot.classList.remove('out-of-stock');
          stockDot.style.opacity = '0.42';
        }
        if (stockNotice) stockNotice.textContent = 'Choose a color to see availability';
        if (quantityInput) {
          quantityInput.max = '';
          quantityInput.value = String(Math.max(1, Number(quantityInput.value || 1)));
        }
        updatePurchaseState();
        return;
      }

      if (quantityInput) {
        quantityInput.max = String(Math.max(stock, 1));
        quantityInput.value = String(
          Math.max(1, Math.min(Number(quantityInput.value || 1), Math.max(stock, 1)))
        );
      }

      if (stockProgress) {
        const progress = stock > 0
          ? Math.min(Math.max(stock * 10, 8), 100)
          : 0;
        stockProgress.style.width = `${progress}%`;
      }

      if (stockText) {
        stockText.textContent = stock > 0 ? `${stock} available` : 'Out of stock';
      }

      if (stockDot) {
        stockDot.style.opacity = '';
        stockDot.classList.toggle('out-of-stock', stock < 1);
      }

      if (stockNotice) {
        stockNotice.textContent = stock < 1
          ? 'This color is currently unavailable'
          : stock <= 5
            ? 'Selling quickly — order soon'
            : 'Available and ready to order';
      }

      updatePurchaseState();
    };

    const setColorState = (variantIndex, { preserveSize = true } = {}) => {
      const variant = variants[variantIndex] || null;
      if (!variant) return;

      const previousSize = preserveSize ? selectedSizeState : '';
      const sizes = variantSizes(variant);
      const nextSelectedSize = sizes.includes(previousSize) ? previousSize : '';

      selectedVariant = variant;

      if (colorInput) colorInput.value = String(variant.color || '');
      if (colorLabel) colorLabel.textContent = String(variant.color || 'Selected color');

      colorButtons.forEach((button, index) => {
        const active = index === variantIndex;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });

      renderSizeOptions(sizes, {
        selected: nextSelectedSize,
        disabled: Number(variant.stock || 0) < 1
      });

      updateStockState(variant);
    };

    const setSizeState = (size) => {
      const normalized = normalizeSize(size);
      if (!normalized) return;

      const allowedSizes = selectedVariant
        ? variantSizes(selectedVariant)
        : allUniqueSizes();

      if (!allowedSizes.includes(normalized)) return;

      selectedSizeState = normalized;
      if (sizeInput) sizeInput.value = normalized;

      currentSizeButtons().forEach((button) => {
        const active = normalizeSize(button.dataset.size || button.textContent) === normalized;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });

      updatePurchaseState();
    };

    const resetInitialSelection = () => {
      selectedVariant = null;
      selectedSizeState = '';

      if (colorInput) colorInput.value = '';
      if (sizeInput) sizeInput.value = '';
      if (colorLabel) colorLabel.textContent = 'Select color';

      colorButtons.forEach((button) => {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
      });

      renderSizeOptions(allUniqueSizes(), { selected: '', disabled: false });
      updateStockState(null);
      page.classList.add('ttt-product-ui-ready');
      updatePurchaseState();
    };

    const clampQuantity = () => {
      if (!quantityInput) return 1;

      const minimum = Math.max(1, Number(quantityInput.min || 1));
      const configuredMax = Number(quantityInput.max || 0);
      const maximum = configuredMax > 0 ? configuredMax : Number.POSITIVE_INFINITY;
      const current = Math.max(minimum, Number(quantityInput.value || minimum));
      const next = Math.min(current, maximum);
      quantityInput.value = String(Number.isFinite(next) ? next : minimum);
      return Number(quantityInput.value || minimum);
    };

    /* Keep only the useful rating number and show the actual money saved beside it. */
    const socialProof = page.querySelector('.product-social-proof');
    const ratingLabel = socialProof?.querySelector('.product-detail-rating small');
    ratingLabel?.remove();
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

    /* Size buttons stay left; availability sits directly below Size guide. */
    const sizeGroup = sizeOptions?.closest('.product-option-group') || null;
    const sizeHeading = sizeGroup?.querySelector('.product-option-heading') || null;

    if (sizeGroup && sizeOptions && stockPanel) {
      sizeGroup.classList.add('product-size-group');
      sizeHeading?.classList.add('product-size-heading');

      const existingLayout = sizeGroup.querySelector('.product-size-availability-layout');
      const layout = existingLayout || document.createElement('div');
      layout.className = 'product-size-availability-layout';

      stockPanel.classList.remove('product-stock-panel');
      stockPanel.classList.add('product-availability-box');
      stockPanel.setAttribute('aria-label', 'Selected color availability');

      if (!existingLayout) {
        sizeOptions.parentNode.insertBefore(layout, sizeOptions);
      }

      layout.append(sizeOptions, stockPanel);
    }

    /* Product-specific wholesale offer from Admin product settings. */
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
    const wholesaleMinimumQuantity = Math.max(
      1,
      Number(wholesaleData?.minimumQuantity || 1)
    );

    let wholesalePanel = null;
    let wholesaleMessage = null;
    let wholesaleBadge = null;

    const updateWholesaleCard = () => {
      if (!wholesalePanel) return;

      const quantity = Math.max(1, Number(quantityInput?.value || 1));
      const remaining = Math.max(0, wholesaleMinimumQuantity - quantity);
      const reached = quantity >= wholesaleMinimumQuantity;

      wholesalePanel.classList.toggle('is-active', reached);

      if (wholesaleMessage) {
        wholesaleMessage.textContent = reached
          ? 'Wholesale active'
          : `Add ${remaining} more ${remaining === 1 ? 'pc' : 'pcs'}`;
      }

      if (wholesaleBadge) {
        wholesaleBadge.textContent = reached ? 'Active' : `${wholesaleMinimumQuantity}+ pcs`;
      }
    };

    if (
      retailPrice > 0 &&
      wholesalePrice > 0 &&
      wholesalePrice < retailPrice &&
      wholesaleMinimumQuantity > 1
    ) {
      const saveEach = Math.max(0, retailPrice - wholesalePrice);
      const initialRemaining = Math.max(0, wholesaleMinimumQuantity - Math.max(1, Number(quantityInput?.value || 1)));

      page.querySelector('#tttProductWholesaleCard')?.remove();

      wholesalePanel = document.createElement('aside');
      wholesalePanel.className = 'ttt-product-wholesale-card';
      wholesalePanel.id = 'tttProductWholesaleCard';
      wholesalePanel.setAttribute('aria-label', 'Wholesale offer');
      wholesalePanel.innerHTML = `
        <span class="ttt-product-wholesale-icon" aria-hidden="true">
          <i class="bi bi-box-seam"></i>
        </span>
        <span class="ttt-product-wholesale-copy">
          <small>WHOLESALE</small>
          <strong data-wholesale-message>Add ${initialRemaining} more ${initialRemaining === 1 ? 'pc' : 'pcs'}</strong>
          <span class="ttt-product-wholesale-detail">
            <span>Rate ৳${wholesalePrice.toLocaleString('en-BD')}</span>
            <span>Save ৳${saveEach.toLocaleString('en-BD')}</span>
          </span>
        </span>
        <span class="ttt-product-wholesale-badge" data-wholesale-badge>${wholesaleMinimumQuantity}+ pcs</span>
      `;

      if (sizeGroup) {
        sizeGroup.insertAdjacentElement('afterend', wholesalePanel);
      } else {
        form?.querySelector('.product-buy-row')?.insertAdjacentElement(
          'beforebegin',
          wholesalePanel
        );
      }

      wholesaleMessage = wholesalePanel.querySelector('[data-wholesale-message]');
      wholesaleBadge = wholesalePanel.querySelector('[data-wholesale-badge]');
      updateWholesaleCard();
    }

    /* Remove the four oversized delivery rows; compact trust badges remain below. */
    page.querySelector('.product-delivery-panel')?.remove();

    /* Upgrade the size guide trigger from emoji to a clean icon control. */
    if (sizeGuideOpen) {
      sizeGuideOpen.innerHTML = '<i class="bi bi-rulers" aria-hidden="true"></i><span>Size guide</span>';
    }

    const sizeGuideModal = document.getElementById('sizeGuideModal');
    const sizeGuideWrap = sizeGuideModal?.querySelector('.size-guide-table-wrap');
    const sizeGuideNote = sizeGuideModal?.querySelector('.size-guide-dialog > p');
    const categoryName = String(
      page.querySelector('.product-title-top .section-kicker')?.textContent || ''
    ).toLowerCase();

    const categoryGuide = (() => {
      if (/pant|trouser|jogger|bottom|quarter/.test(categoryName)) return 'bottom';
      if (/hoodie|jacket|sweatshirt|outer/.test(categoryName)) return 'outer';
      return 'top';
    })();

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
          <p class="ttt-size-guide-copy">Pants, trousers and joggers — general waist guide. Some styles may use numeric waist sizes.</p>
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
        if (!button) return;
        setGuide(button.dataset.guideTab);
      });

      setGuide(categoryGuide);
    }

    if (sizeGuideNote) {
      sizeGuideNote.textContent =
        'General fit guide only. The selectable sizes shown on each product are the final available options for that item.';
    }

    /* Initial product state: all unique sizes visible, nothing preselected. */
    resetInitialSelection();

    /* product.ejs still registers its legacy initializer before this deferred file.
       Reconcile once at DOMContentLoaded so selectVariant(0) can never remain visible. */
    document.addEventListener('DOMContentLoaded', () => {
      if (!selectionTouched) resetInitialSelection();
    }, { once: true });

    window.setTimeout(() => {
      if (!selectionTouched) resetInitialSelection();
    }, 0);

    document.addEventListener('click', (event) => {
      const colorButton = event.target.closest('.professional-product-page .product-color-option');

      if (colorButton) {
        selectionTouched = true;
        const variantIndex = Number(colorButton.dataset.variantIndex);
        setColorState(variantIndex, { preserveSize: true });
        updateWholesaleCard();
        return;
      }

      const sizeButton = event.target.closest('.professional-product-page .product-size-option');

      if (sizeButton) {
        selectionTouched = true;
        if (!sizeButton.disabled) {
          setSizeState(sizeButton.dataset.size || sizeButton.textContent);
        }
        return;
      }

      if (event.target.closest('#decreaseQuantity, #increaseQuantity')) {
        window.setTimeout(() => {
          clampQuantity();
          updateWholesaleCard();
        }, 0);
      }
    });

    quantityInput?.addEventListener('input', () => {
      clampQuantity();
      updateWholesaleCard();
    });

    quantityInput?.addEventListener('change', () => {
      clampQuantity();
      updateWholesaleCard();
    });

    decreaseQuantity?.setAttribute('aria-controls', 'productQuantity');
    increaseQuantity?.setAttribute('aria-controls', 'productQuantity');

    form?.addEventListener('submit', (event) => {
      updatePurchaseState();

      if (
        !hasColorSelection() ||
        !hasSizeSelection() ||
        selectedStock() < 1
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const focusTarget = !hasColorSelection()
          ? colorButtons[0]
          : !hasSizeSelection()
            ? currentSizeButtons().find((button) => !button.disabled)
            : null;

        focusTarget?.focus();
        focusTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, true);

    /* On mobile, tapping the image no longer opens zoom accidentally.
       The explicit zoom button still works normally. */
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
  });
})();
