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
