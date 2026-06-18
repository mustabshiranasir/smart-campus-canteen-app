import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Food from '../models/Food.js';
import { calcLineTotal, calcUnitPrice, validateSelectedExtras, sanitizeSelectedExtras } from '../utils/orderPricing.js';
import { getDefaultExtrasForFood } from '../utils/foodExtrasPresets.js';
import { logWalletTransaction } from '../utils/walletLog.js';
import UserLocation from '../models/UserLocation.js';

const ACTIVE_STATUSES = ['pending', 'preparing', 'ready'];

export const getOrderPriority = (role) => (role === 'faculty' ? 1 : 2);

const sortOrdersForQueue = (orders) => {
  return [...orders].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status);
    const bActive = ACTIVE_STATUSES.includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (aActive && bActive) {
      const priorityDiff = (a.priority ?? 2) - (b.priority ?? 2);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

const sortPendingByPriority = (orders) =>
  [...orders].sort((a, b) => {
    const priorityDiff = (a.priority ?? 2) - (b.priority ?? 2);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

export const createOrder = async (req, res, next) => {
  try {
    const { paymentMethod, deliveryAddress, pickupLocation, shareLiveLocation } = req.body;
    
    // Process Wallet Payment
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account is blocked due to multiple no-shows. Please contact administration.' });
    }

    if (paymentMethod === 'cash' && user.cashBlockedUntil && user.cashBlockedUntil > new Date()) {
      return res.status(403).json({ success: false, message: 'Cash on Delivery is temporarily blocked for your account due to previous no-shows.' });
    }

    // Get user's cart
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    let totalAmount = 0;
    let totalQuantity = 0;
    const orderItems = [];
    const foodsToUpdate = [];

    for (let item of cart.items) {
      if (!item.productId) continue;
      
      // Fetch latest food item to ensure stock accuracy and prevent race conditions
      const foodItem = await Food.findById(item.productId._id);
      if (!foodItem) {
        return res.status(404).json({ success: false, message: `Product ${item.productId.name} not found` });
      }

      const isAvailable = foodItem.status !== 'unavailable' && foodItem.stock > 0;
      if (!isAvailable) {
        return res.status(400).json({ success: false, message: `Product ${foodItem.name} is out of stock` });
      }

      if (foodItem.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Only ${foodItem.stock} items left in stock for ${foodItem.name}` });
      }

      const foodExtras = foodItem.extras?.length ? foodItem.extras : getDefaultExtrasForFood(foodItem);
      const rawExtras = item.selectedExtras || [];
      const extraCheck = validateSelectedExtras(foodExtras, rawExtras);
      if (!extraCheck.valid) {
        return res.status(400).json({ success: false, message: extraCheck.message });
      }
      const selectedExtras = sanitizeSelectedExtras(foodExtras, rawExtras);
      const unitPrice = calcUnitPrice(foodItem.price, selectedExtras);
      const lineTotal = calcLineTotal(foodItem.price, item.quantity, selectedExtras);
      totalAmount += lineTotal;
      totalQuantity += item.quantity;

      if (item.quantity > 10) {
        return res.status(400).json({ success: false, message: `Limit of 10 quantity per item exceeded for ${foodItem.name}.` });
      }

      orderItems.push({
        productId: foodItem._id,
        quantity: item.quantity,
        price: foodItem.price,
        selectedExtras,
        unitPrice,
        lineTotal,
      });

      foodsToUpdate.push({
        foodDoc: foodItem,
        quantityToReduce: item.quantity
      });
    }

    if (totalQuantity > 20) {
      return res.status(400).json({ success: false, message: `Limit of 20 total items per order exceeded. You have ${totalQuantity} items.` });
    }

    const isBulk = totalQuantity > 10 || totalAmount > 5000;
    if (isBulk && paymentMethod === 'cash') {
      return res.status(400).json({ success: false, message: 'Cash on Delivery is not allowed for bulk orders (quantity > 10 or total > Rs. 5000). Please use Wallet.' });
    }

    if (paymentMethod === 'wallet') {
      if (user.walletBalance < totalAmount) {
        return res.status(400).json({ success: false, message: `Insufficient wallet balance. Total is Rs. ${totalAmount}, but you only have Rs. ${user.walletBalance}.` });
      }
      user.walletBalance = Math.round(user.walletBalance - totalAmount);
      await user.save();

      // Log the debit transaction for the wallet payment
      await logWalletTransaction({
        userId: user._id,
        amount: totalAmount,
        type: 'debit',
        paymentMethod: 'wallet',
        note: `Payment for Order`,
        balanceAfter: user.walletBalance,
      });
    }

    // Actually update the stocks in database
    for (let update of foodsToUpdate) {
      const { foodDoc, quantityToReduce } = update;
      foodDoc.stock = Math.max(0, foodDoc.stock - quantityToReduce);
      if (foodDoc.stock === 0) {
        foodDoc.status = 'unavailable';
      }
      await foodDoc.save();
    }

    const initialStatus = isBulk ? 'pending_approval' : 'pending';

    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      totalAmount,
      status: initialStatus,
      requiresAdminApproval: isBulk,
      adminApproved: !isBulk,
      priority: getOrderPriority(req.user.role),
      paymentMethod: paymentMethod || 'wallet',
      deliveryAddress: deliveryAddress || '',
      pickupLocation: pickupLocation || undefined,
      shareLiveLocation: !!shareLiveLocation,
    });

    if (shareLiveLocation && pickupLocation?.latitude != null && pickupLocation?.longitude != null) {
      await UserLocation.findOneAndUpdate(
        { userId: req.user._id },
        {
          userId: req.user._id,
          name: req.user.name,
          role: req.user.role,
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude,
          isSharing: true,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    // Clear the cart
    cart.items = [];
    await cart.save();

    const shortId = order._id.toString().slice(-6).toUpperCase();
    await Notification.create({
      isAdmin: true,
      message: `New Order #${shortId} placed by ${req.user.name} (Total: Rs. ${totalAmount})`
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const orders = await Order.find(query)
      .populate('items.productId')
      .populate('userId', 'name email role profilePicture profilePictureVisibility')
      .sort(req.user.role === 'admin' ? { priority: 1, createdAt: 1 } : { createdAt: -1 });

    const orderedList = req.user.role === 'admin' ? sortOrdersForQueue(orders) : orders;

    const sanitizedOrders = orderedList.map(order => {
      const orderObj = order.toObject();
      if (orderObj.userId) {
        const isOwner = orderObj.userId._id.toString() === req.user._id.toString();
        if (!isOwner && orderObj.userId.profilePictureVisibility === 'private') {
          orderObj.userId.profilePicture = null;
        }
      }
      return orderObj;
    });

    res.status(200).json({ success: true, data: sanitizedOrders });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    // Map 'delivered' or other names correctly
    const validStatuses = ['pending_approval', 'pending', 'preparing', 'ready', 'completed', 'cancelled', 'delivered', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const oldStatus = order.status;

    // If order is transitioned to cancelled or no-show, refund wallet balance and restore stock
    if ((status === 'cancelled' || status === 'no-show') && (oldStatus !== 'cancelled' && oldStatus !== 'no-show')) {
      if (order.paymentMethod === 'wallet') {
        const user = await User.findById(order.userId);
        if (user) {
          user.walletBalance = Math.round(user.walletBalance + order.totalAmount);
          await user.save();

          await logWalletTransaction({
            userId: user._id,
            amount: order.totalAmount,
            type: 'refund',
            paymentMethod: 'wallet',
            note: `Refund for Cancelled Order #${order._id.toString().slice(-6).toUpperCase()}`,
            balanceAfter: user.walletBalance,
          });
        }
      }

      // Restore stocks in DB
      for (let item of order.items) {
        if (item.productId) {
          const foodItem = await Food.findById(item.productId._id || item.productId);
          if (foodItem) {
            foodItem.stock = (foodItem.stock || 0) + item.quantity;
            if (foodItem.status === 'unavailable' && foodItem.stock > 0) {
              foodItem.status = 'available';
            }
            await foodItem.save();
          }
        }
      }
    }

    order.status = status;
    if (status === 'pending' && oldStatus === 'pending_approval') {
      order.adminApproved = true;
    }
    await order.save();

    // No-show tracking
    if (status === 'no-show' && oldStatus !== 'no-show') {
      const orderUser = await User.findById(order.userId);
      if (orderUser) {
        orderUser.strikes = (orderUser.strikes || 0) + 1;
        if (orderUser.strikes >= 3) {
          orderUser.isBlocked = true;
        } else if (orderUser.strikes === 2) {
          const blockDate = new Date();
          blockDate.setDate(blockDate.getDate() + 7);
          orderUser.cashBlockedUntil = blockDate;
        }
        await orderUser.save();
      }
    }

    const shortId = order._id.toString().slice(-6).toUpperCase();
    if (status !== oldStatus) {
      if (req.user.role === 'admin') {
        // Notify the student
        let statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        let msg = `Your Order #${shortId} status has been updated to "${statusLabel}".`;
        if (status === 'cancelled') {
          msg = `Your Order #${shortId} has been cancelled by the Canteen Admin.`;
        }
        await Notification.create({
          userId: order.userId,
          isAdmin: false,
          message: msg
        });
      } else {
        // Notify the admin that student cancelled the order
        if (status === 'cancelled') {
          await Notification.create({
            isAdmin: true,
            message: `Order #${shortId} has been cancelled by ${req.user.name}.`
          });
        }
      }
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * Priority queue processor: faculty (priority 1) before students (priority 2), FIFO within tier.
 * Maps requirement statuses: processing -> preparing, ready for pickup -> ready.
 */
export const processOrders = async (req, res, next) => {
  try {
    const pendingOrders = await Order.find({ status: 'pending' })
      .populate('userId', 'name role')
      .lean(false);

    const queue = sortPendingByPriority(pendingOrders);
    const processed = [];

    for (const order of queue) {
      const shortId = order._id.toString().slice(-6).toUpperCase();
      const customerRole = order.userId?.role || 'student';
      const tierLabel = order.priority === 1 ? 'faculty (high priority)' : 'student';

      order.status = 'preparing';
      await order.save();
      console.log(`[Order Queue] Order #${shortId} (${tierLabel}) — status: processing`);

      const itemSummary = order.items.map((i) => `${i.quantity}x item`).join(', ');
      console.log(`[Order Queue] Preparing Order #${shortId}: ${itemSummary || 'no items'}`);

      order.status = 'ready';
      await order.save();
      console.log(`[Order Queue] Order #${shortId} — ready for pickup`);

      await Notification.create({
        userId: order.userId._id || order.userId,
        isAdmin: false,
        message: `Your Order #${shortId} is ready for pickup.`,
      });

      processed.push({
        orderId: order._id,
        shortId,
        priority: order.priority,
        customerRole,
        status: order.status,
      });
    }

    res.status(200).json({
      success: true,
      message: `Processed ${processed.length} order(s) from the priority queue`,
      data: { processedCount: processed.length, processed },
    });
  } catch (error) {
    next(error);
  }
};
