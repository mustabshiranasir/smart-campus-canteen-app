/**
 * Default add-ons per food type (used when DB has no extras yet).
 */
export const COMMON_EXTRAS = [
  { name: 'Extra Raita', price: 35, maxQuantity: 2 },
  { name: 'Extra Salad', price: 45, maxQuantity: 2 },
  { name: 'Extra Sauce', price: 25, maxQuantity: 3 },
];

export const getDefaultExtrasForFood = (food) => {
  const name = (food.name || '').toLowerCase();
  const category = (food.category || '').toLowerCase();

  if (category.includes('drink') || category.includes('beverage') || name.includes('coffee') || name.includes('shake')) {
    return [
      { name: 'Extra Ice', price: 15, maxQuantity: 1 },
      { name: 'Whipped Cream', price: 40, maxQuantity: 1 },
      { name: 'Extra Shot', price: 60, maxQuantity: 2 },
    ];
  }

  if (name.includes('burger') || name.includes('sandwich') || name.includes('wrap') || category.includes('fast')) {
    return [
      { name: 'Extra Cheese', price: 50, maxQuantity: 2 },
      { name: 'Extra Patty', price: 120, maxQuantity: 1 },
      { name: 'Extra Toppings', price: 40, maxQuantity: 3 },
      { name: 'Extra Fries', price: 80, maxQuantity: 1 },
      ...COMMON_EXTRAS,
    ];
  }

  if (name.includes('biryani') || name.includes('rice') || name.includes('karahi') || category.includes('asian')) {
    return [
      { name: 'Extra Raita', price: 35, maxQuantity: 3 },
      { name: 'Extra Salad', price: 45, maxQuantity: 2 },
      { name: 'Boiled Egg', price: 40, maxQuantity: 2 },
      { name: 'Extra Gravy', price: 50, maxQuantity: 2 },
    ];
  }

  if (name.includes('pizza') || category.includes('italian')) {
    return [
      { name: 'Extra Cheese', price: 60, maxQuantity: 2 },
      { name: 'Extra Toppings', price: 50, maxQuantity: 3 },
      { name: 'Stuffed Crust', price: 90, maxQuantity: 1 },
    ];
  }

  if (category.includes('healthy') || name.includes('salad')) {
    return [
      { name: 'Extra Protein (Chicken)', price: 100, maxQuantity: 1 },
      { name: 'Extra Avocado', price: 70, maxQuantity: 1 },
      { name: 'Extra Dressing', price: 30, maxQuantity: 2 },
      { name: 'Extra Salad', price: 40, maxQuantity: 2 },
    ];
  }

  if (category.includes('dessert') || name.includes('cake') || name.includes('ice')) {
    return [
      { name: 'Extra Topping', price: 35, maxQuantity: 2 },
      { name: 'Chocolate Drizzle', price: 30, maxQuantity: 1 },
      { name: 'Extra Scoop', price: 80, maxQuantity: 2 },
    ];
  }

  return [
    { name: 'Extra Portion', price: 90, maxQuantity: 1 },
    { name: 'Extra Cheese', price: 50, maxQuantity: 2 },
    ...COMMON_EXTRAS,
  ];
};

export const PRESET_EXTRA_PACKS = {
  pakistani: [
    { name: 'Extra Raita', price: 35, maxQuantity: 3 },
    { name: 'Extra Salad', price: 45, maxQuantity: 2 },
    { name: 'Extra Naan', price: 40, maxQuantity: 3 },
  ],
  fastFood: [
    { name: 'Extra Cheese', price: 50, maxQuantity: 2 },
    { name: 'Extra Toppings', price: 40, maxQuantity: 3 },
    { name: 'Extra Fries', price: 80, maxQuantity: 1 },
  ],
  drinks: [
    { name: 'Extra Ice', price: 15, maxQuantity: 1 },
    { name: 'Extra Shot', price: 60, maxQuantity: 2 },
  ],
};
