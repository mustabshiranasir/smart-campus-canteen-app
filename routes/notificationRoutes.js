// routes/notificationRoutes.js
import express from 'express';
import {
  getNotifications,
  deleteNotification,
  clearNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/clear-all', clearNotifications);
router.delete('/:id', deleteNotification);

export default router;
