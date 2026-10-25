import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}
export const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Normalize user object for consistency
    req.user = {
      userId: decoded.id || decoded.userId,
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role?.toLowerCase() || '',
      clubId: decoded.clubId || decoded.club_id
    };

    console.log('✅ Token authenticated for user:', req.user.email, 'Role:', req.user.role);
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user.role?.toLowerCase() || '';
    const isAuthorized = allowedRoles.some(role =>
      userRole === role.toLowerCase()
    );

    if (!isAuthorized) {
      console.warn(`❌ Permission denied for user ${req.user.email} with role ${req.user.role}. Required roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        error: 'Forbidden - insufficient permissions',
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Check if user is secretary or webadmin
export const requireAdmin = requireRole('secretary', 'depsec', 'webadmin', 'admin');

// Check if user is club admin (or higher)
export const requireClubAdmin = requireRole('secretary', 'depsec', 'webadmin', 'admin', 'club');
