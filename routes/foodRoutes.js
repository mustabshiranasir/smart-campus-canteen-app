import express from 'express';
import { getFoods, createFood, updateFood, deleteFood, uploadFoodImage as uploadFoodImageController, rateFood } from '../controllers/foodController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/isAdmin.js';
import { uploadFoodImage } from '../middleware/upload.js';

const router = express.Router();

// GET /api/food - Available to both student and admin (filters logic inside controller)
router.get('/', requireAuth, getFoods);

// POST /api/food/upload - Admin only
router.post('/upload', requireAuth, isAdmin, uploadFoodImage.single('foodImage'), uploadFoodImageController);

// POST, PUT, DELETE /api/food - Admin only
router.post('/', requireAuth, isAdmin, createFood);
router.put('/:id', requireAuth, isAdmin, updateFood);
router.delete('/:id', requireAuth, isAdmin, deleteFood);

// POST /api/food/:id/rate - Available to authenticated users
router.post('/:id/rate', requireAuth, rateFood);

export default router;
