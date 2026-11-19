import express from 'express';
import { getAllUsers, getRescueTeams, updateSquadLocation } from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { authorizeRoles, ROLES } from '../middleware/rbac.js';

const router = express.Router();

// Get list of rescue teams (Accessible to Admins, Disaster Authorities, and Rescue Teams)
router.get(
  '/rescue-teams',
  authenticateJWT,
  authorizeRoles(ROLES.ADMIN, ROLES.AUTHORITY, ROLES.RESCUE_TEAM),
  getRescueTeams
);

// Update squad live GPS location (Rescue Team, Disaster Authority, Admin)
router.patch(
  '/:id/location',
  authenticateJWT,
  authorizeRoles(ROLES.ADMIN, ROLES.AUTHORITY, ROLES.RESCUE_TEAM),
  updateSquadLocation
);

// Get all users (Admin only)
router.get(
  '/',
  authenticateJWT,
  authorizeRoles(ROLES.ADMIN),
  getAllUsers
);

export default router;
