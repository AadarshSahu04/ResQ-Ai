export const ROLES = {
  ADMIN: 'Admin',
  AUTHORITY: 'Disaster Authority',
  RESCUE_TEAM: 'Rescue Team',
  PUBLIC_USER: 'Public User',
};

/**
 * Middleware for Strict Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles - List of authorized role strings
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient privileges for this emergency resource.',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}
