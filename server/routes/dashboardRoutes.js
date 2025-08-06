// server/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController'); // Import the new dashboard controller

// You can add authentication middleware here if needed for your dashboard route
// For example: router.use(protect); // Assuming you have a protect middleware

router.get('/stats', getDashboardStats); // This route will be accessible at /api/dashboard/stats

module.exports = router;