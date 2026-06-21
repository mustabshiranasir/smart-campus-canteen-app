import express from 'express';
import { chatWithAssistant, getRecommendations } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/chat', chatWithAssistant);
router.get('/recommendations', getRecommendations);

export default router;
