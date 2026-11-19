import express from 'express';
import {
  createIncident,
  getAllIncidents,
  getIncidentById,
  updateIncidentStatus,
  verifyIncident,
} from '../controllers/incidentController.js';
import { authenticateJWT, optionalAuth } from '../middleware/auth.js';
import { authorizeRoles, ROLES } from '../middleware/rbac.js';

const router = express.Router();

// Public / Authenticated reporting
router.post('/', optionalAuth, createIncident);

// List incidents
router.get('/', authenticateJWT, getAllIncidents);

// Get single incident
router.get('/:id', authenticateJWT, getIncidentById);

// Update status & team assignment
router.patch(
  '/:id/status',
  authenticateJWT,
  authorizeRoles(ROLES.ADMIN, ROLES.AUTHORITY, ROLES.RESCUE_TEAM),
  updateIncidentStatus
);

// Human-in-the-Loop: Manual verification by Disaster Authority or Admin
router.post(
  '/:id/verify',
  authenticateJWT,
  authorizeRoles(ROLES.ADMIN, ROLES.AUTHORITY),
  verifyIncident
);

export default router;
