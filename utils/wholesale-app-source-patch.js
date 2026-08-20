'use strict';

function patchWholesaleAppSource(input) {
  let source = String(input || '');

  function replaceBetween(startMarker, endMarker, replacement, label) {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Missing start marker for ${label}`);

    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Missing end marker for ${label}`);

    source = source.slice(0, start) + replacement + source.slice(end);
  }

  function replaceOnce(search, replacement, label) {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Missing pattern for ${label}`);
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Pattern is not unique for ${label}`);
    }

    source =
      source.slice(0, first) +
      replacement +
      source.slice(first + search.length);
  }

  function replaceAllExact(search, replacement, expectedCount, label) {
    const count = source.split(search).length - 1;
    if (count !== expectedCount) {
      throw new Error(`Expected ${expectedCount} matches for ${label}, found ${count}`);
    }

    source = source.split(search).join(replacement);
  }

  const cartWholesaleBlock = `/* =========================================
   WHOLESALE + CART PRICING HELPERS
========================================= */

const DEFAULT_WHOLESALE_MINIMUM_QUANTITY = 10;

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getWholesaleProductKey(item, index) {
  return String(
    item.productId ||
    item.product?._id ||
    item.product ||
    \`line-\${index}\`
  );
}

function getWholesaleSummary(items = []) {
  const normalizedItems = items.map((item, index) => {
    const quantity = Math.max(
      0,
      Math.floor(Number(item.quantity || 0))
    );

    const retailPrice = Math.max(
      0,
      Number(
        item.retailPrice ??
        item.price ??
        item.unitPrice ??
        0
      )
    );

    const wholesalePrice = Math.max(
      0,
      Number(item.wholesalePrice || 0)
    );

    const wholesaleMinimumQuantity = Math.max(
      1,
      Math.floor(
        Number(
          item.wholesaleMinimumQuantity ||
          DEFAULT_WHOLESALE_MINIMUM_QUANTITY
        )
      )
    );

    return {
      ...item,
      productKey: getWholesaleProductKey(item, index),
      quantity,
      price: retailPrice,
      retailPrice,
      wholesalePrice,
      wholesaleMinimumQuantity,
      lineTotal: roundMoney(retailPrice * quantity)
    };
  });

  const quantityByProduct = new Map();

  normalizedItems.forEach(item => {
    quantityByProduct.set(
      item.productKey,
      Number(quantityByProduct.get(item.productKey) || 0) + item.quantity
    );
  });

  const pricedItems = normalizedItems.map(item => {
    const productQuantity = Number(
      quantityByProduct.get(item.productKey) || 0
    );

    const wholesaleApplied =
      item.wholesalePrice > 0 &&
      item.wholesalePrice < item.retailPrice &&
      productQuantity >= item.wholesaleMinimumQuantity;

    const effectiveUnitPrice = wholesaleApplied
      ? item.wholesalePrice
      : item.retailPrice;

    return {
      ...item,
      productQuantity,
      wholesaleApplied,
      effectiveUnitPrice: roundMoney(effectiveUnitPrice),
      effectiveLineTotal: roundMoney(effectiveUnitPrice * item.quantity)
    };
  });

  const itemCount = pricedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subtotal = roundMoney(
    pricedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    )
  );

  const subtotalAfterWholesale = roundMoney(
    pricedItems.reduce(
      (sum, item) => sum + item.effectiveLineTotal,
      0
    )
  );

  const wholesaleDiscount = roundMoney(
    Math.max(0, subtotal - subtotalAfterWholesale)
  );

  return {
    items: pricedItems,
    itemCount,
    wholesaleEligible: wholesaleDiscount > 0,
    wholesaleDiscount,
    subtotal,
    subtotalAfterWholesale
  };
}

async function getCartPricing(cart = []) {
  if (!cart.length) {
    return getWholesaleSummary([]);
  }

  const productIds = [
    ...new Set(
      cart
        .map(item => String(item.productId || '').trim())
        .filter(id => /^[a-f0-9]{24}$/i.test(id))
    )
  ];

  const products = productIds.length
    ? await Product.find({
        _id: { $in: productIds },
        active: true
      })
        .select(
          '_id name slug price wholesalePrice wholesaleMinimumQuantity stock variants'
        )
        .lean()
    : [];

  const productMap = new Map(
    products.map(product => [
      product._id.toString(),
      product
    ])
  );

  const items = cart.map((item, index) => {
    const product = productMap.get(
      String(item.productId || '')
    );

    const retailPrice = Math.max(
      0,
      Number(product?.price ?? item.price ?? 0)
    );

    const quantity = Math.max(
      0,
      Math.floor(Number(item.quantity || 0))
    );

    const variant = product?.variants?.find(
      option => option.color === item.color
    );

    const availableStock = product
      ? variant
        ? Math.max(0, Number(variant.stock || 0))
        : Math.max(0, Number(product.stock || 0))
      : Math.max(0, Number(item.quantity || 0));

    return {
      ...item,
      index,
      name: product?.name || item.name,
      slug: product?.slug || item.slug,
      price: retailPrice,
      retailPrice,
      wholesalePrice: Math.max(
        0,
        Number(product?.wholesalePrice || 0)
      ),
      wholesaleMinimumQuantity: Math.max(
        1,
        Math.floor(
          Number(
            product?.wholesaleMinimumQuantity ||
            DEFAULT_WHOLESALE_MINIMUM_QUANTITY
          )
        )
      ),
      quantity,
      availableStock,
      lineTotal: roundMoney(retailPrice * quantity)
    };
  });

  return getWholesaleSummary(items);
}

async function buildCartPayload(req) {
  const cart = req.session.cart || [];

  try {
    const pricing = await getCartPricing(cart);

    return {
      items: pricing.items.map(item => ({
        index: item.index,
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        price: item.effectiveUnitPrice,
        retailPrice: item.retailPrice,
        wholesaleApplied: item.wholesaleApplied,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        lineTotal: item.effectiveLineTotal
      })),
      subtotal: pricing.subtotalAfterWholesale,
      retailSubtotal: pricing.subtotal,
      wholesaleDiscount: pricing.wholesaleDiscount,
      count: pricing.itemCount
    };
  } catch (error) {
    console.error('Cart pricing lookup failed:', error.message);

    const items = cart.map((item, index) => ({
      index,
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      image: item.image,
      price: Number(item.price || 0),
      size: item.size,
      color: item.color,
      quantity: Number(item.quantity || 0),
      lineTotal: roundMoney(
        Number(item.price || 0) * Number(item.quantity || 0)
      )
    }));

    const subtotal = roundMoney(
      items.reduce((sum, item) => sum + item.lineTotal, 0)
    );

    return {
      items,
      subtotal,
      retailSubtotal: subtotal,
      wholesaleDiscount: 0,
      count: items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }
}

app.post('/cart/add', async (req, res) => {
  try {
    const product =
      await Product.findById(req.body.productId)
        .lean();

    if (!product || !product.active) {
      throw new Error(
        'This product is unavailable.'
      );
    }

    const requestedColor =
      String(req.body.color || '').trim();

    const variant =
      product.variants?.find(
        item => item.color === requestedColor
      ) ||
      product.variants?.[0] ||
      null;

    const availableStock =
      variant
        ? Number(variant.stock || 0)
        : Number(product.stock || 0);

    if (availableStock < 1) {
      throw new Error(
        'This color is currently out of stock.'
      );
    }

    const availableSizes =
      variant?.sizes?.length
        ? variant.sizes
        : product.sizes || [];

    const requestedSize =
      String(req.body.size || '').trim();

    const size =
      availableSizes.includes(requestedSize)
        ? requestedSize
        : availableSizes[0] || 'One Size';

    const color =
      variant?.color ||
      requestedColor ||
      product.colors?.[0] ||
      'Default';

    const quantity = Math.max(
      1,
      Math.min(
        Number(req.body.quantity) || 1,
        availableStock
      )
    );

    const selectedImage =
      variant?.images?.[0]?.url ||
      product.images?.[0]?.url ||
      '';

    const retailPrice = Number(product.price || 0);
    const wholesalePrice = Number(product.wholesalePrice || 0);
    const wholesaleMinimumQuantity = Math.max(
      1,
      Number(
        product.wholesaleMinimumQuantity ||
        DEFAULT_WHOLESALE_MINIMUM_QUANTITY
      )
    );

    req.session.cart ||= [];

    const existing =
      req.session.cart.find(item =>
        item.productId === product._id.toString() &&
        item.size === size &&
        item.color === color
      );

    if (existing) {
      existing.quantity = Math.min(
        existing.quantity + quantity,
        availableStock
      );

      existing.image = selectedImage;
      existing.price = retailPrice;
      existing.wholesalePrice = wholesalePrice;
      existing.wholesaleMinimumQuantity = wholesaleMinimumQuantity;
    } else {
      req.session.cart.push({
        productId: product._id.toString(),
        name: product.name,
        slug: product.slug,
        image: selectedImage,
        price: retailPrice,
        wholesalePrice,
        wholesaleMinimumQuantity,
        size,
        color,
        quantity
      });
    }

    const successMessage =
      \`${'${product.name}'} (${'${color}'}, ${'${size}'}) added to cart.\`;

    req.session.flash = {
      type: 'success',
      message: successMessage
    };

    if (wantsJsonResponse(req)) {
      return res.json({
        success: true,
        message: successMessage,
        cart: await buildCartPayload(req)
      });
    }

    const requestedRedirect =
      String(req.body.redirectTo || '').trim();

    if (requestedRedirect === '/checkout') {
      return res.redirect('/checkout');
    }

    return res.redirect(
      req.get('referer') || '/shop'
    );
  } catch (error) {
    req.session.flash = {
      type: 'error',
      message: error.message
    };

    if (wantsJsonResponse(req)) {
      return res.status(400).json({
        success: false,
        message: error.message,
        cart: await buildCartPayload(req)
      });
    }

    res.redirect(
      req.get('referer') || '/shop'
    );
  }
});

app.get('/cart', async (req, res, next) => {
  try {
    const pricing = await getCartPricing(req.session.cart || []);

    res.render('cart', {
      title: 'Your cart',
      cart: pricing.items,
      subtotal: pricing.subtotal,
      wholesaleDiscount: pricing.wholesaleDiscount,
      subtotalAfterWholesale: pricing.subtotalAfterWholesale
    });
  } catch (error) {
    next(error);
  }
});

app.post('/cart/update', async (req, res) => {
  try {
    const index = Number(req.body.index);
    const qty = Number(req.body.quantity);
    const cart = req.session.cart || [];
    const item = cart[index];

    if (!item) {
      throw new Error('Cart item not found.');
    }

    if (qty <= 0) {
      cart.splice(index, 1);
    } else {
      const pricing = await getCartPricing(cart);
      const pricedItem = pricing.items[index];
      const availableStock = Math.max(
        0,
        Number(pricedItem?.availableStock || 0)
      );

      if (availableStock < 1) {
        throw new Error('This product option is currently out of stock.');
      }

      item.quantity = Math.min(
        availableStock,
        Math.max(1, Math.floor(qty || 1))
      );
    }

    if (wantsJsonResponse(req)) {
      return res.json({
        success: true,
        cart: await buildCartPayload(req)
      });
    }

    res.redirect('/cart');
  } catch (error) {
    if (wantsJsonResponse(req)) {
      return res.status(400).json({
        success: false,
        message: error.message,
        cart: await buildCartPayload(req)
      });
    }

    req.session.flash = {
      type: 'error',
      message: error.message
    };

    res.redirect('/cart');
  }
});

app.post('/cart/remove', async (req, res) => {
  req.session.cart?.splice(Number(req.body.index), 1);

  if (wantsJsonResponse(req)) {
    return res.json({
      success: true,
      cart: await buildCartPayload(req)
    });
  }

  res.redirect('/cart');
});

function parseBangladeshDateTime(value) {`;

  replaceBetween(
    'function buildCartPayload(req) {',
    'function parseBangladeshDateTime(value) {',
    cartWholesaleBlock,
    'cart and wholesale pricing block'
  );

  const legacyPricingBlock = `      const subtotal =
        cart.reduce(
          (sum, item) =>
            sum +
            Number(item.price || 0) *
            Number(item.quantity || 0),
          0
        );

      const deliveryFee =
        subtotal >= 3000
          ? 0
          : 80;

      const wholesale =
        getWholesaleSummary(cart);`;

  const currentPricingBlock = `      const cartPricing =
        await getCartPricing(cart);

      const subtotal =
        cartPricing.subtotal;

      const deliveryFee =
        subtotal >= 3000
          ? 0
          : 80;

      const wholesale =
        cartPricing;`;

  replaceAllExact(
    legacyPricingBlock,
    currentPricingBlock,
    3,
    'cart pricing in coupon and checkout routes'
  );

  replaceOnce(
    `app.post(
  '/coupon/remove',
  (req, res) => {`,
    `app.post(
  '/coupon/remove',
  async (req, res) => {`,
    'async coupon remove route'
  );

  replaceOnce(
    `      res.render('checkout', {
        title: 'Checkout',
        user,
        subtotal,`,
    `      res.render('checkout', {
        title: 'Checkout',
        user,
        cart: cartPricing.items,
        subtotal,`,
    'checkout enriched cart locals'
  );

  replaceOnce(
    `        items.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          image: selectedImage,
          size: cartItem.size,
          color: cartItem.color,
          quantity,
          unitPrice:
            Number(product.price),
          lineTotal:
            Number(product.price) *
            quantity
        });`,
    `        const retailPrice =
          Number(product.price || 0);

        items.push({
          product: product._id,
          productId: product._id.toString(),
          name: product.name,
          sku: product.sku,
          image: selectedImage,
          size: cartItem.size,
          color: cartItem.color,
          quantity,
          price: retailPrice,
          retailPrice,
          wholesalePrice:
            Math.max(
              0,
              Number(product.wholesalePrice || 0)
            ),
          wholesaleMinimumQuantity:
            Math.max(
              1,
              Number(
                product.wholesaleMinimumQuantity ||
                DEFAULT_WHOLESALE_MINIMUM_QUANTITY
              )
            ),
          unitPrice: retailPrice,
          lineTotal:
            retailPrice * quantity
        });`,
    'checkout product wholesale metadata'
  );

  return source;
}

module.exports = patchWholesaleAppSource;
