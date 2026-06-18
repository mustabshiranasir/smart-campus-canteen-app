import express from 'express';
import { createOrder, getOrders, updateOrderStatus, processOrders } from '../controllers/orderController.js';
import { requireAuth, isAdmin } from '../middleware/auth.js';
import { validateRequest, orderSchema } from '../validators/index.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', validateRequest(orderSchema), createOrder);
router.get('/', getOrders);
router.post('/process-queue', isAdmin, processOrders);
router.patch('/:id/status', updateOrderStatus);

export default router;
