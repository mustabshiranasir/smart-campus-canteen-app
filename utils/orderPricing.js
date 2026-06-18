export const calcExtrasTotal = (extras = []) =>
  extras.reduce((sum, e) => sum + (e.price || 0) * (e.quantity || 1), 0);

export const calcUnitPrice = (basePrice, extras = []) =>
  (basePrice || 0) + calcExtrasTotal(extras);

export const calcLineTotal = (basePrice, quantity, extras = []) =>
  calcUnitPrice(basePrice, extras) * (quantity || 1);

export const normalizeExtrasKey = (extras = []) =>
  JSON.stringify(
    extras
      .map((e) => ({ n: e.name, p: e.price, q: e.quantity || 1 }))
      .sort((a, b) => a.n.localeCompare(b.n))
  );

export const validateSelectedExtras = (foodExtras = [], selectedExtras = []) => {
  for (const sel of selectedExtras) {
    const option = foodExtras.find((e) => e.name === sel.name);
    if (!option) {
      return { valid: false, message: `Invalid extra: ${sel.name}` };
    }
    const qty = sel.quantity || 1;
    if (qty < 1 || qty > (option.maxQuantity || 3)) {
      return { valid: false, message: `Invalid quantity for ${sel.name}` };
    }
    if (sel.price !== option.price) {
      return { valid: false, message: `Price mismatch for ${sel.name}` };
    }
  }
  return { valid: true };
};

export const sanitizeSelectedExtras = (foodExtras = [], selectedExtras = []) =>
  selectedExtras
    .filter((sel) => foodExtras.some((e) => e.name === sel.name))
    .map((sel) => {
      const option = foodExtras.find((e) => e.name === sel.name);
      return {
        name: option.name,
        price: option.price,
        quantity: Math.min(Math.max(sel.quantity || 1, 1), option.maxQuantity || 3),
      };
    });
