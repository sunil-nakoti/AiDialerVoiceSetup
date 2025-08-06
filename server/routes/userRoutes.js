// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Assuming your protect middleware is generic
const userController = require('../controllers/userController'); // We'll create this controller

// Get current user's profile (admin or agent)
router.route('/profile').get(protect, userController.getMe);
// Update current user's profile (admin or agent)
router.route('/profile').put(protect, userController.updateMe);
// --- NEW: Route to get login logs for the authenticated user ---
router.route('/login-logs').get(protect, userController.getLoginLogs);
// --- END NEW ---
module.exports = router;