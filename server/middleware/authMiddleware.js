// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // --- DEBUG LOGS START ---
  console.log('Auth middleware: Incoming request to protected route.');
  console.log('Request Headers:', req.headers); // Log all headers to see Authorization
  // --- DEBUG LOGS END ---

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      // --- DEBUG LOGS START ---
      console.log('Auth middleware: Extracted Token:', token);
      console.log('Auth middleware: JWT_SECRET from .env:', process.env.JWT_SECRET ? 'Loaded' : 'NOT LOADED');
      // --- DEBUG LOGS END ---

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // --- DEBUG LOGS START ---
      console.log('Auth middleware: Decoded JWT payload:', decoded);
      console.log('Auth middleware: Decoded ID:', decoded.id, 'Decoded Role:', decoded.role);
      // --- DEBUG LOGS END ---

      let foundUser = null;

      if (decoded.role === 'agent') {
        foundUser = await Agent.findById(decoded.id).select('-password');
        // --- DEBUG LOGS START ---
        console.log('Auth middleware: Attempted to find Agent. Found:', foundUser ? foundUser._id : 'None');
        // --- DEBUG LOGS END ---
      } else if (decoded.role === 'admin') {
        foundUser = await User.findById(decoded.id).select('-password');
        // --- DEBUG LOGS START ---
        console.log('Auth middleware: Attempted to find Admin. Found:', foundUser ? foundUser._id : 'None');
        // --- DEBUG LOGS END ---
      } else {
        console.warn('Auth middleware: Unknown role in token:', decoded.role);
        return res.status(401).json({ message: 'Not authorized, unknown user role in token.' });
      }

      if (!foundUser) {
        console.error('Auth middleware: User not found in DB with decoded ID.');
        return res.status(401).json({ message: 'Not authorized, user associated with token not found.' });
      }

      req.user = {
        ...foundUser.toObject(),
        role: decoded.role,
      };

      console.log('Auth middleware: Successfully populated req.user with:', { id: req.user._id, role: req.user.role });
      next();
    } catch (error) {
      // This catch block is hit if jwt.verify fails (e.g., invalid token, expired token)
      console.error('Auth middleware: Error during token verification or user lookup:', error.message);
      // Log the specific error for more insight
      if (error.name === 'TokenExpiredError') {
          console.error('Auth middleware: JWT Error - Token has expired!');
          return res.status(401).json({ message: 'Not authorized, token has expired. Please log in again.' });
      } else if (error.name === 'JsonWebTokenError') {
          console.error('Auth middleware: JWT Error - Invalid token signature or malformed token!');
          return res.status(401).json({ message: 'Not authorized, invalid token.' });
      }
      return res.status(401).json({ message: 'Not authorized, token validation failed.' });
    }
  }

  if (!token) {
    console.error('Auth middleware: No token found in Authorization header.');
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

// ADD THIS authorizeRoles FUNCTION HERE
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        // Ensure req.user exists and has a role
        if (!req.user || !req.user.role) {
            console.warn('Authorization: req.user or req.user.role is missing. User is not authenticated or role not set.');
            return res.status(403).json({ message: 'Not authorized, user role not defined.' });
        }

        // Check if the user's role is included in the allowed roles
        if (!roles.includes(req.user.role)) {
            console.warn(`Authorization: User with role '${req.user.role}' attempted to access a route requiring roles: ${roles.join(', ')}`);
            return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route.` });
        }
        
        next(); // User is authorized, proceed to the next middleware/controller
    };
};

module.exports = { protect, authorizeRoles }; // Make sure to export authorizeRoles as well