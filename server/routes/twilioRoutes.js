const express = require('express');
const {
  searchAvailableNumbers,
  purchaseNumbers,
  getPurchasedNumbers,
  assignNumberToAgent,
  configureCallForwarding,
  getTwiml,
     voicemailFallback,       // <--- NEW: Import voicemailFallback
    recordVoicemailCallback, // <--- NEW: Import recordVoicemailCallback
     exportPurchasedNumbers 
} = require('../controllers/twilioController');

const router = express.Router();

router.get('/search', searchAvailableNumbers);
router.post('/buy', purchaseNumbers);
router.get('/purchased', getPurchasedNumbers);
router.put('/:id/assign', assignNumberToAgent);
router.put('/:id/forward', configureCallForwarding);
router.post('/twiml/:id', getTwiml);
router.get('/export', exportPurchasedNumbers); 

// --- NEW ROUTES FOR VOICEMAIL FALLBACK ---
router.get('/voicemail-fallback/:id', voicemailFallback);
router.post('/record-voicemail-callback', recordVoicemailCallback); // For recorded voicemails
// --- END NEW ROUTES ---

module.exports = router;