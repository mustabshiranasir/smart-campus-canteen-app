import express from 'express';
import { topupWallet } from '../controllers/walletController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/wallet/topup - Protected by authentication middleware
router.post('/topup', requireAuth, topupWallet);

export default router;
