import { requireAuth } from './authMiddleware.js';
import { isAdmin } from './isAdmin.js';

export { requireAuth, isAdmin };
// Alias adminOnly to isAdmin for backwards compatibility
export const adminOnly = isAdmin;
