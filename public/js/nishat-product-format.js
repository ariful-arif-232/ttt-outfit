(() => {
  const formatPriceText = value => {
    const cleaned = String(value || '')
      .replace(/৳/g, '')
      .replace(/Tk/gi, '')
      .replace(/BDT/gi, '')
      .trim();

    if (!cleaned) return '';
    return `Tk ${cleaned} BDT`;
  };

  const apply = () => {
    const page = document.querySelector('.professional-product-page');
    if (!page) return;

    const price = page.querySelector('.product-detail-price');
    if (!price) return;

    const current = price.querySelector(':scope > strong');
    const old = price.querySelector(':scope > del');

    if (current) {
      current.textContent = formatPriceText(current.textContent);
    }

    if (old) {
      old.textContent = formatPriceText(old.textContent);
      price.insertBefore(old, current || price.firstChild);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
