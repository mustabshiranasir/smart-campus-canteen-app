import express from 'express';
import { register, login, getMe, logout, sendOTP } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest, registerSchema, loginSchema } from '../validators/index.js';

const router = express.Router();

router.post('/send-otp', sendOTP);
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
