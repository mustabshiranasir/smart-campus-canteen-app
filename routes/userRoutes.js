import express from 'express';
import { getSettings, updateSettings, updateProfile, updatePassword, topupWallet, uploadProfilePicture } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest, settingsSchema } from '../validators/index.js';
import { uploadProfilePicture as upload } from '../middleware/upload.js';

const router = express.Router();

router.use(requireAuth);

router.get('/settings', getSettings);
router.put('/settings', validateRequest(settingsSchema), updateSettings);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);
router.post('/wallet/topup', topupWallet);
router.post('/profile-picture', upload.single('profilePicture'), uploadProfilePicture);

export default router;
