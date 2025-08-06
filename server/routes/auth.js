// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login); // Ensure this line is present and uncommented
router.post('/logout', authController.logout);

// --- NEW: Route for Admin Password Change ---
// This route should be protected and ideally restricted to 'admin' role
router.post('/change-password', protect, authController.updatePassword);


module.exports = router;