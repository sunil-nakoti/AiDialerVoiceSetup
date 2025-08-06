// server/routes/dialerRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // <--- Make sure this is imported
const {
  createCampaign,
  getCampaigns,
  updateCampaignStatus,
  deleteCampaign,
  twilioStatusCallback,
 outboundIvr,
    processOutboundIvr,
     getVoiceDialerLogsForCampaign, // <-- ADD THIS LINE
} = require('../controllers/dialerController');

// Campaign Management
// Apply authentication middleware to relevant routes
router.route('/campaigns').get(protect, getCampaigns);
  // .post(protect, dialerController.createCampaign)
  // .get(protect, dialerController.getCampaigns); // <--- ENSURE 'protect' IS APPLIED HERE

router.post('/campaigns', createCampaign);
// router.get('/campaigns', getCampaigns);
router.put('/campaigns/:id/status', updateCampaignStatus);
router.delete('/campaigns/:id', deleteCampaign);
router.get('/outbound-ivr', outboundIvr); // Twilio calls this first for the IVR
router.post('/process-outbound-ivr', processOutboundIvr); // Twilio posts to this after gathering digits
router.post('/twilio-status-callback', twilioStatusCallback);
// Voice Dialer Log Report Route <-- NEW
router.get('/campaigns/:campaignId/logs', protect, getVoiceDialerLogsForCampaign); // <-- ADD THIS LINE

module.exports = router;