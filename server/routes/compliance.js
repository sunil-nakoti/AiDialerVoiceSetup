// server/routes/compliance.js
const express = require('express');
const router = express.Router();
// Import authentication and authorization middleware
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Adjust path as needed

const {
    ensureGlobalSettings,
    getComplianceSettings,
    updateComplianceSettings,
    getComplianceMetrics,
    getComplianceViolations,
    logComplianceViolation,
    exportComplianceViolations
} = require('../controllers/complianceController'); // Correct path to controller
// const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Adjust path as needed
// Middleware to ensure a single settings document exists for all compliance routes
router.use(ensureGlobalSettings);

// Public routes (for testing, ideally these would be protected with authentication)
router.get('/settings', getComplianceSettings);
// router.post('/settings', updateComplianceSettings);
router.post('/settings', protect, authorizeRoles('admin'), updateComplianceSettings);
router.get('/metrics', protect, getComplianceMetrics);
router.get('/violations', protect, getComplianceViolations);
router.post('/violations', logComplianceViolation); // This endpoint is crucial for your dialer to report violations
// New endpoint for exporting violations
router.get('/violations/export', protect, exportComplianceViolations);
module.exports = router;