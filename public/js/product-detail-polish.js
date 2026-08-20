(() => {
  'use strict';

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

    const selectedStock = () =>
      Number(selectedVariant?.stock || 0);

    const updatePurchaseState = () => {
      const readyToBuy =
        hasColorSelection() &&
        hasSizeSelection() &&
        selectedStock() > 0;

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

    const clearInitialSelection = () => {
      selectedVariant = null;

      if (colorInput) colorInput.value = '';
      if (sizeInput) sizeInput.value = '';

      if (colorLabel) {
        colorLabel.textContent = 'Select a color';
      }

      colorButtons.forEach((button) => {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
      });

      clearSizeSelection({ disable: true });

      if (stockText) {
        stockText.textContent = 'Select a color to view availability';
      }

      if (stockProgress) {
        stockProgress.style.width = '0%';
      }

      if (stockDot) {
        stockDot.classList.remove('out-of-stock');
        stockDot.style.opacity = '0.42';
      }

      updatePurchaseState();
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

    /* Product-specific wholesale offer from the admin product settings. */
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
    let wholesaleDetail = null;
    let wholesaleBadge = null;

    if (
      retailPrice > 0 &&
      wholesalePrice > 0 &&
      wholesalePrice < retailPrice &&
      wholesaleMinimumQuantity > 1
    ) {
      const saveEach = Math.max(0, retailPrice - wholesalePrice);
      const savePercent = Math.max(
        0,
        Math.round((saveEach / retailPrice) * 100)
      );

      wholesalePanel = document.createElement('aside');
      wholesalePanel.className = 'ttt-product-wholesale-card';
      wholesalePanel.id = 'tttProductWholesaleCard';
      wholesalePanel.setAttribute('aria-label', 'Wholesale offer');
      wholesalePanel.innerHTML = `
        <span class="ttt-product-wholesale-icon" aria-hidden="true">
          <i class="bi bi-box-seam"></i>
        </span>
        <span class="ttt-product-wholesale-copy">
          <small>WHOLESALE OFFER</small>
          <strong data-wholesale-message>Buy ${wholesaleMinimumQuantity}+ pcs for bulk pricing</strong>
          <span data-wholesale-detail>৳${wholesalePrice.toLocaleString('en-BD')}/pc · Save ৳${saveEach.toLocaleString('en-BD')} each${savePercent ? ` (${savePercent}%)` : ''}</span>
        </span>
        <span class="ttt-product-wholesale-badge" data-wholesale-badge>${wholesaleMinimumQuantity}+ pcs</span>
      `;

      page.querySelector('.product-stock-panel')?.insertAdjacentElement(
        'afterend',
        wholesalePanel
      );

      wholesaleMessage = wholesalePanel.querySelector('[data-wholesale-message]');
      wholesaleDetail = wholesalePanel.querySelector('[data-wholesale-detail]');
      wholesaleBadge = wholesalePanel.querySelector('[data-wholesale-badge]');

      const updateWholesaleCard = () => {
        const quantity = Math.max(1, Number(quantityInput?.value || 1));
        const remaining = Math.max(0, wholesaleMinimumQuantity - quantity);
        const reached = quantity >= wholesaleMinimumQuantity;

        wholesalePanel.classList.toggle('is-active', reached);

        if (wholesaleMessage) {
          wholesaleMessage.textContent = reached
            ? `Wholesale quantity reached · ${quantity} pcs`
            : `Add ${remaining} more ${remaining === 1 ? 'pc' : 'pcs'} to reach wholesale`;
        }

        if (wholesaleDetail) {
          wholesaleDetail.textContent =
            `Bulk rate ৳${wholesalePrice.toLocaleString('en-BD')}/pc · Save ৳${saveEach.toLocaleString('en-BD')} each${savePercent ? ` (${savePercent}%)` : ''}`;
        }

        if (wholesaleBadge) {
          wholesaleBadge.textContent = reached ? 'Bulk rate' : `${wholesaleMinimumQuantity}+ pcs`;
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

    /* Existing product logic selects the first variant on load. Remove that default. */
    clearInitialSelection();

    document.addEventListener('click', (event) => {
      const colorButton = event.target.closest('.professional-product-page .product-color-option');

      if (colorButton) {
        const variantIndex = Number(colorButton.dataset.variantIndex);
        selectedVariant = variants[variantIndex] || null;

        colorButtons.forEach((button) => {
          button.setAttribute(
            'aria-pressed',
            String(button === colorButton)
          );
        });

        if (stockDot) stockDot.style.opacity = '';

        /* Existing handler redraws sizes and selects the first one; clear it immediately. */
        clearSizeSelection({ disable: false });
        return;
      }

      const sizeButton = event.target.closest('.professional-product-page .product-size-option');

      if (sizeButton) {
        currentSizeButtons().forEach((button) => {
          button.setAttribute(
            'aria-pressed',
            String(button === sizeButton)
          );
        });

        updatePurchaseState();
      }
    });

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
            ? currentSizeButtons()[0]
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
