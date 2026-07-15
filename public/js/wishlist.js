document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'ttt-outfit-wishlist';

  const wishlistButtons =
    document.querySelectorAll(
      '.product-wishlist-button'
    );

  const wishlistCountElements =
    document.querySelectorAll(
      '[data-wishlist-count]'
    );

  const currentUserLoggedIn =
    document.body.dataset.loggedIn === 'true';

  function readGuestWishlist() {
    try {
      const saved =
        JSON.parse(
          localStorage.getItem(STORAGE_KEY) || '[]'
        );

      return Array.isArray(saved)
        ? [...new Set(saved.map(String))]
        : [];
    } catch (error) {
      return [];
    }
  }

  function saveGuestWishlist(productIds) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        [...new Set(productIds.map(String))]
      )
    );
  }

  function updateWishlistCount(count) {
    wishlistCountElements.forEach(element => {
      element.textContent = String(count);
    });
  }

  function updateButton(button, isSaved) {
    button.classList.toggle(
      'active',
      isSaved
    );

    button.setAttribute(
      'aria-pressed',
      String(isSaved)
    );

    const productName =
      button.dataset.productName ||
      'product';

    button.setAttribute(
      'title',
      isSaved
        ? 'Remove from Wishlist'
        : 'Add to Wishlist'
    );

    button.setAttribute(
      'aria-label',
      isSaved
        ? `Remove ${productName} from wishlist`
        : `Add ${productName} to wishlist`
    );

    const icon = button.querySelector('span');

    if (icon) {
      icon.textContent =
        isSaved ? '♥' : '♡';
    }
  }

  function refreshAllButtons(productIds) {
    const savedSet =
      new Set(productIds.map(String));

    document
      .querySelectorAll(
        '.product-wishlist-button'
      )
      .forEach(button => {
        updateButton(
          button,
          savedSet.has(
            String(button.dataset.productId)
          )
        );
      });

    updateWishlistCount(savedSet.size);
  }

  async function getAccountWishlist() {
    const response =
      await fetch('/api/wishlist');

    if (!response.ok) {
      throw new Error(
        'Could not load wishlist.'
      );
    }

    return response.json();
  }

  async function syncGuestWishlist() {
    const guestIds =
      readGuestWishlist();

    const response =
      await fetch('/api/wishlist/sync', {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          productIds: guestIds
        })
      });

    if (!response.ok) {
      throw new Error(
        'Could not sync wishlist.'
      );
    }

    const result =
      await response.json();

    localStorage.removeItem(STORAGE_KEY);

    return result.productIds || [];
  }

  async function addAccountWishlist(productId) {
    const response =
      await fetch('/api/wishlist/add', {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          productId
        })
      });

    if (!response.ok) {
      throw new Error(
        'Could not add wishlist product.'
      );
    }

    return response.json();
  }

  async function removeAccountWishlist(productId) {
    const response =
      await fetch('/api/wishlist/remove', {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          productId
        })
      });

    if (!response.ok) {
      throw new Error(
        'Could not remove wishlist product.'
      );
    }

    return response.json();
  }

  async function initializeWishlist() {
    try {
      if (currentUserLoggedIn) {
        const productIds =
          await syncGuestWishlist();

        refreshAllButtons(productIds);
      } else {
        refreshAllButtons(
          readGuestWishlist()
        );
      }

      await renderGuestWishlistPage();
    } catch (error) {
      console.error(
        'Wishlist initialization error:',
        error
      );

      if (!currentUserLoggedIn) {
        refreshAllButtons(
          readGuestWishlist()
        );

        await renderGuestWishlistPage();
      }
    }
  }

  document.addEventListener(
    'click',
    async event => {
      const button =
        event.target.closest(
          '.product-wishlist-button'
        );

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      if (button.disabled) return;

      const productId =
        String(
          button.dataset.productId || ''
        );

      if (!productId) return;

      button.disabled = true;

      try {
        if (currentUserLoggedIn) {
          const isCurrentlySaved =
            button.classList.contains('active');

          const result =
            isCurrentlySaved
              ? await removeAccountWishlist(
                  productId
                )
              : await addAccountWishlist(
                  productId
                );

          updateButton(
            button,
            !isCurrentlySaved
          );

          updateWishlistCount(
            result.count || 0
          );

          if (isCurrentlySaved) {
            removeWishlistPageCard(
              productId
            );
          }
        } else {
          let savedIds =
            readGuestWishlist();

          const isCurrentlySaved =
            savedIds.includes(productId);

          if (isCurrentlySaved) {
            savedIds =
              savedIds.filter(
                id => id !== productId
              );
          } else {
            savedIds.push(productId);
          }

          saveGuestWishlist(savedIds);

          refreshAllButtons(savedIds);

          if (isCurrentlySaved) {
            removeWishlistPageCard(
              productId
            );
          } else {
            await renderGuestWishlistPage();
          }
        }
      } catch (error) {
        console.error(
          'Wishlist update error:',
          error
        );
      } finally {
        button.disabled = false;
      }
    }
  );

  function removeWishlistPageCard(productId) {
    document
      .querySelectorAll(
        `[data-wishlist-product="${productId}"]`
      )
      .forEach(element => {
        element.remove();
      });

    checkWishlistPageEmpty();
  }

  function checkWishlistPageEmpty() {
    const serverGrid =
      document.getElementById(
        'serverWishlistGrid'
      );

    if (
      serverGrid &&
      !serverGrid.querySelector(
        '[data-wishlist-product]'
      )
    ) {
      window.location.reload();
    }

    const guestGrid =
      document.getElementById(
        'guestWishlistGrid'
      );

    const guestEmpty =
      document.getElementById(
        'guestWishlistEmpty'
      );

    if (
      guestGrid &&
      guestEmpty
    ) {
      const hasCards =
        Boolean(
          guestGrid.querySelector(
            '[data-wishlist-product]'
          )
        );

      guestEmpty.hidden = hasCards;
    }
  }

  async function renderGuestWishlistPage() {
    const guestGrid =
      document.getElementById(
        'guestWishlistGrid'
      );

    const emptyState =
      document.getElementById(
        'guestWishlistEmpty'
      );

    if (!guestGrid || !emptyState) {
      return;
    }

    const productIds =
      readGuestWishlist();

    if (!productIds.length) {
      guestGrid.innerHTML = '';
      emptyState.hidden = false;
      return;
    }

    const response =
      await fetch('/api/wishlist/cards', {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          productIds
        })
      });

    if (!response.ok) {
      throw new Error(
        'Could not load wishlist cards.'
      );
    }

    const result =
      await response.json();

    guestGrid.innerHTML =
      result.cards
        .map(
          card => `
            <div
              class="wishlist-card-wrapper"
              data-wishlist-product="${card.productId}"
            >
              ${card.html}
            </div>
          `
        )
        .join('');

    emptyState.hidden =
      result.cards.length > 0;

    refreshAllButtons(productIds);
  }

  initializeWishlist();
});
