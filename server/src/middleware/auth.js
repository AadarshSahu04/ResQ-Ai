import jwt from 'jsonwebtoken';

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No authorization token provided.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  try {
    const secret = process.env.JWT_SECRET || 'resq_ai_super_secret_jwt_encryption_key_2026_secure';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.', details: err.message });
  }
}

// Optional auth for public SOS submissions while identifying logged-in citizens
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  try {
    const secret = process.env.JWT_SECRET || 'resq_ai_super_secret_jwt_encryption_key_2026_secure';
    req.user = jwt.verify(token, secret);
  } catch (err) {
    req.user = null;
  }
  next();
}
