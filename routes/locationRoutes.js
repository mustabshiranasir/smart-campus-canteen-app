import express from 'express';
import {
  updateMyLocation,
  getMyLocation,
  stopSharingLocation,
  getAllSharedLocations,
} from '../controllers/locationController.js';
import { requireAuth, isAdmin } from '../middleware/auth.js';
import { validateRequest, locationUpdateSchema } from '../validators/index.js';

const router = express.Router();

router.use(requireAuth);

router.get('/me', getMyLocation);
router.post('/me', validateRequest(locationUpdateSchema), updateMyLocation);
router.patch('/me/stop', stopSharingLocation);
router.get('/live', isAdmin, getAllSharedLocations);

export default router;
