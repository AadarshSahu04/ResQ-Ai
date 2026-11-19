import express from 'express';
import {
  createHazard,
  getAllHazards,
  toggleHazardStatus,
  deleteHazard,
} from '../controllers/hazardController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { authorizeRoles, ROLES } from '../middleware/rbac.js';

const router = express.Router();

// Get active or all hazards (Open to authenticated personnel)
router.get('/', authenticateJWT, getAllHazards);

// Draw and save hazard zone (Admin & Disaster Authority only)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(ROLES.ADMIN, ROLES.AUTHORITY),
  createHazard
);

// Toggle active status (Admin & Disaster Authority only)
router.patch(
  '/:id/toggle',
  authenticateJWT,
  authorizeRoles(ROLES.ADMIN, ROLES.AUTHORITY),
  toggleHazardStatus
);

// Delete hazard (Admin & Disaster Authority only)
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles(ROLES.ADMIN, ROLES.AUTHORITY),
  deleteHazard
);

export default router;
