import express from 'express';
import { getCart, addToCart, updateCartItem, customizeCartItem, removeFromCart } from '../controllers/cartController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest, cartItemSchema, cartCustomizeSchema } from '../validators/index.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getCart);
router.post('/', validateRequest(cartItemSchema), addToCart);
router.put('/:id', updateCartItem);
router.patch('/:id/customize', validateRequest(cartCustomizeSchema), customizeCartItem);
router.delete('/:id', removeFromCart);

export default router;
