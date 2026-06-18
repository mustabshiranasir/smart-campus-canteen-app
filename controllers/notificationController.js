// controllers/notificationController.js
import Notification from '../models/Notification.js';

export const getNotifications = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'admin') {
      query = { isAdmin: true };
    } else {
      query = { userId: req.user._id, isAdmin: false };
    }
    const notifications = await Notification.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    // Verify ownership if not admin
    if (req.user.role !== 'admin' && notification.userId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this notification' });
    }
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    if (req.user.role !== 'admin' && notification.userId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    notification.read = true;
    await notification.save();
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { isAdmin: true, read: false }
        : { userId: req.user._id, isAdmin: false, read: false };
    await Notification.updateMany(query, { $set: { read: true } });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const clearNotifications = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'admin') {
      query = { isAdmin: true };
    } else {
      query = { userId: req.user._id, isAdmin: false };
    }
    await Notification.deleteMany(query);
    res.status(200).json({ success: true, message: 'All notifications cleared successfully' });
  } catch (error) {
    next(error);
  }
};
