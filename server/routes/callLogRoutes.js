const express = require('express');
const router = express.Router();
const callLogController = require('../controllers/callLogController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Adjust path as needed

router.get('/call-logs', protect, callLogController.getCallLogs);

module.exports = router;