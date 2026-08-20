(() => {
  'use strict';

  const initCartPageFix = () => {
    const cartPage = document.querySelector('.premium-cart-page');
    if (!cartPage || cartPage.dataset.cartPageFixReady === 'true') return;
    cartPage.dataset.cartPageFixReady = 'true';

    const style = document.createElement('style');
    style.textContent = `
      .cart-quantity-stepper {
        display: inline-flex;
        align-items: center;
        overflow: hidden;
        border: 1px solid #d8cfbe;
        border-radius: 11px;
        background: #fff;
      }

      .cart-quantity-stepper .cart-quantity-input {
        width: 48px;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        padding: 0 4px;
        appearance: textfield;
        -moz-appearance: textfield;
      }

      .cart-quantity-stepper .cart-quantity-input::-webkit-inner-spin-button,
      .cart-quantity-stepper .cart-quantity-input::-webkit-outer-spin-button {
        margin: 0;
        -webkit-appearance: none;
      }

      .cart-qty-step {
        width: 38px;
        height: 43px;
        display: inline-grid;
        place-items: center;
        border: 0;
        background: #f7f2e8;
        color: #0b3229;
        font-size: 19px;
        font-weight: 800;
        line-height: 1;
        cursor: pointer;
        touch-action: manipulation;
      }

      .cart-qty-step:active {
        background: #ead8a6;
      }

      .cart-action-status {
        display: none;
        margin: 12px 0 0;
        padding: 10px 12px;
        border-radius: 10px;
        background: #fff4f1;
        color: #9c3434;
        font-size: 12px;
        font-weight: 700;
      }

      .cart-action-status.is-visible {
        display: block;
      }

      .cart-quantity-form.is-submitting,
      .cart-remove-form.is-submitting {
        opacity: .62;
        pointer-events: none;
      }

      @media (max-width: 460px) {
        .cart-quantity-stepper {
          border-radius: 8px;
        }

        .cart-quantity-stepper .cart-quantity-input {
          width: 40px;
          height: 34px;
          font-size: 12.5px;
        }

        .cart-qty-step {
          width: 32px;
          height: 34px;
          font-size: 17px;
        }

        .cart-quantity-form {
          gap: 7px;
        }
      }
    `;
    document.head.appendChild(style);

    const heading = cartPage.querySelector('.cart-heading-wrap');
    const status = document.createElement('p');
    status.className = 'cart-action-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    heading?.appendChild(status);

    const showError = (message) => {
      if (!status) return;
      status.textContent = String(message || 'Could not update your cart. Please try again.');
      status.classList.add('is-visible');
    };

    const clampQuantity = (input, value) => {
      const minimum = Math.max(1, Number(input.min) || 1);
      const maximum = Math.max(minimum, Number(input.max) || 20);
      const nextValue = Math.min(maximum, Math.max(minimum, Number(value) || minimum));
      input.value = String(nextValue);
      return nextValue;
    };

    cartPage.querySelectorAll('.cart-quantity-form').forEach((form) => {
      const input = form.querySelector('.cart-quantity-input');
      if (!input || input.closest('.cart-quantity-stepper')) return;

      input.min = '1';
      input.max = '20';
      input.inputMode = 'numeric';

      const stepper = document.createElement('div');
      stepper.className = 'cart-quantity-stepper';

      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'cart-qty-step';
      minus.dataset.cartQtyStep = '-1';
      minus.setAttribute('aria-label', 'Decrease quantity');
      minus.textContent = '−';

      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'cart-qty-step';
      plus.dataset.cartQtyStep = '1';
      plus.setAttribute('aria-label', 'Increase quantity');
      plus.textContent = '+';

      input.parentNode.insertBefore(stepper, input);
      stepper.append(minus, input, plus);
      clampQuantity(input, input.value);
    });

    cartPage.querySelectorAll('form[action="/cart/remove"]').forEach((form) => {
      form.classList.add('cart-remove-form');
    });

    cartPage.addEventListener('click', (event) => {
      const stepButton = event.target.closest('[data-cart-qty-step]');
      if (!stepButton || !cartPage.contains(stepButton)) return;

      const form = stepButton.closest('.cart-quantity-form');
      const input = form?.querySelector('.cart-quantity-input');
      if (!input) return;

      const delta = Number(stepButton.dataset.cartQtyStep || 0);
      clampQuantity(input, Number(input.value || 1) + delta);
    });

    cartPage.addEventListener('change', (event) => {
      const input = event.target.closest('.cart-quantity-input');
      if (input) clampQuantity(input, input.value);
    });

    document.addEventListener('submit', async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const action = new URL(form.action, window.location.origin).pathname;
      if (action !== '/cart/update' && action !== '/cart/remove') return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (form.dataset.submitting === 'true') return;
      form.dataset.submitting = 'true';
      form.classList.add('is-submitting');
      status?.classList.remove('is-visible');

      form.querySelectorAll('button, input').forEach((control) => {
        if (control instanceof HTMLButtonElement) control.disabled = true;
      });

      try {
        const params = new URLSearchParams();
        new FormData(form).forEach((value, key) => {
          params.append(key, String(value));
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
          throw new Error(payload?.message || 'Could not update your cart.');
        }

        window.location.replace('/cart');
      } catch (error) {
        form.dataset.submitting = 'false';
        form.classList.remove('is-submitting');
        form.querySelectorAll('button').forEach((button) => {
          button.disabled = false;
        });
        showError(error?.message || 'Could not update your cart. Please try again.');
      }
    }, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartPageFix, { once: true });
  } else {
    initCartPageFix();
  }
})();
