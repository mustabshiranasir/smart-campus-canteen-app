import Cart from '../models/Cart.js';
import Food from '../models/Food.js';
import {
  normalizeExtrasKey,
  validateSelectedExtras,
  sanitizeSelectedExtras,
} from '../utils/orderPricing.js';
import { getDefaultExtrasForFood } from '../utils/foodExtrasPresets.js';

const findMatchingCartIndex = (cart, productId, selectedExtras) => {
  const key = normalizeExtrasKey(selectedExtras);
  return cart.items.findIndex(
    (item) =>
      item.productId.toString() === productId &&
      normalizeExtrasKey(item.selectedExtras) === key
  );
};

const findCartItemIndex = (cart, id) => {
  const bySubId = cart.items.findIndex((item) => item._id.toString() === id);
  if (bySubId > -1) return bySubId;
  return cart.items.findIndex((item) => item.productId.toString() === id);
};

export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, selectedExtras = [] } = req.body;

    const food = await Food.findById(productId);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    if (food.status === 'unavailable' || food.stock <= 0) {
      return res.status(400).json({ success: false, message: `Product "${food.name}" is out of stock` });
    }

    const foodExtras = food.extras?.length ? food.extras : getDefaultExtrasForFood(food);
    const extraValidation = validateSelectedExtras(foodExtras, selectedExtras);
    if (!extraValidation.valid) {
      return res.status(400).json({ success: false, message: extraValidation.message });
    }

    const sanitizedExtras = sanitizeSelectedExtras(foodExtras, selectedExtras);

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    const itemIndex = findMatchingCartIndex(cart, productId, sanitizedExtras);
    const existingQty = itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
    const targetQty = existingQty + quantity;

    if (targetQty > 10) {
      return res.status(400).json({ success: false, message: `Limit of 10 quantity per item exceeded for "${food.name}".` });
    }

    const currentTotalQty = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    if (currentTotalQty - existingQty + targetQty > 20) {
      return res.status(400).json({ success: false, message: `Limit of 20 total items per order exceeded.` });
    }

    if (food.stock < targetQty) {
      return res.status(400).json({
        success: false,
        message: `Only ${food.stock} items left in stock for "${food.name}"`,
      });
    }

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, selectedExtras: sanitizedExtras });
    }
    await cart.save();

    cart = await Cart.findById(cart._id).populate('items.productId');
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { id } = req.params;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = findCartItemIndex(cart, id);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    const food = await Food.findById(cart.items[itemIndex].productId);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    if (food.status === 'unavailable' || food.stock <= 0) {
      return res.status(400).json({ success: false, message: `Product "${food.name}" is out of stock` });
    }

    if (quantity > 10) {
      return res.status(400).json({ success: false, message: `Limit of 10 quantity per item exceeded for "${food.name}".` });
    }

    const currentTotalQty = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const oldQty = cart.items[itemIndex].quantity;
    if (currentTotalQty - oldQty + quantity > 20) {
      return res.status(400).json({ success: false, message: `Limit of 20 total items per order exceeded.` });
    }

    if (food.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${food.stock} items left in stock for "${food.name}"`,
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    next(error);
  }
};

export const customizeCartItem = async (req, res, next) => {
  try {
    const { quantity, selectedExtras = [] } = req.body;
    const { id } = req.params;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = findCartItemIndex(cart, id);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    const food = await Food.findById(cart.items[itemIndex].productId);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    const foodExtras = food.extras?.length ? food.extras : getDefaultExtrasForFood(food);
    const extraValidation = validateSelectedExtras(foodExtras, selectedExtras);
    if (!extraValidation.valid) {
      return res.status(400).json({ success: false, message: extraValidation.message });
    }

    const sanitizedExtras = sanitizeSelectedExtras(foodExtras, selectedExtras);
    const newQty = quantity ?? cart.items[itemIndex].quantity;

    if (newQty > 10) {
      return res.status(400).json({ success: false, message: `Limit of 10 quantity per item exceeded for "${food.name}".` });
    }

    const currentTotalQty = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const oldQty = cart.items[itemIndex].quantity;
    if (currentTotalQty - oldQty + newQty > 20) {
      return res.status(400).json({ success: false, message: `Limit of 20 total items per order exceeded.` });
    }

    if (food.stock < newQty) {
      return res.status(400).json({
        success: false,
        message: `Only ${food.stock} items left in stock for "${food.name}"`,
      });
    }

    cart.items[itemIndex].selectedExtras = sanitizedExtras;
    cart.items[itemIndex].quantity = newQty;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = findCartItemIndex(cart, id);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    next(error);
  }
};
