export const calcExtrasTotal = (extras = []) =>
  extras.reduce((sum, e) => sum + (e.price || 0) * (e.quantity || 1), 0);

export const calcUnitPrice = (basePrice, extras = []) =>
  (basePrice || 0) + calcExtrasTotal(extras);

export const calcLineTotal = (basePrice, qty, extras = []) =>
  calcUnitPrice(basePrice, extras) * (qty || 1);
