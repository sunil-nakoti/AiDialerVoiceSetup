const express = require('express');
const { getSettings, saveSettings, verifyCredentials } = require('../controllers/settingController'); // Adjust path
// const { protect } = require('../middleware/authMiddleware'); // Uncomment if you have auth middleware

const router = express.Router();

// Apply authentication middleware if you have user authentication (highly recommended for production)
// router.get('/', protect, getSettings);
// router.post('/', protect, saveSettings);
// router.post('/verify', protect, verifyCredentials);

// For now, without authentication middleware (adjust based on your app's auth setup):
router.get('/', getSettings);
router.post('/', saveSettings);
router.post('/verify', verifyCredentials); // For live verification

module.exports = router;