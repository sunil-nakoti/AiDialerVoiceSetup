// server/utils/twilioService.js
const twilio = require('twilio');
const Setting = require('../models/Setting');

let twilioClientInstance = null;

/**
 * Initializes and returns a Twilio client
 * @returns {Twilio.TwilioClient}
 */
const getTwilioClient = async () => {
  if (twilioClientInstance) {
    return twilioClientInstance;
  }

  try {
    // Prefer DB settings if present; otherwise fall back to env vars
    let accountSID;
    let authToken;

    const settings = await Setting.findOne({});
    if (settings && settings.accountSID && settings.authToken) {
      accountSID = settings.accountSID;
      authToken = settings.authToken;
    } else {
      accountSID = process.env.TWILIO_ACCOUNT_SID;
      authToken = process.env.TWILIO_AUTH_TOKEN;
    }

    if (!accountSID || !authToken) {
      throw new Error('Twilio credentials not found. Add them in Settings or set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    }

    twilioClientInstance = twilio(accountSID, authToken);
    console.log('Twilio client initialized.');
    return twilioClientInstance;
  } catch (error) {
    twilioClientInstance = null;
    throw new Error(`Failed to initialize Twilio client: ${error.message}`);
  }
};

module.exports = { getTwilioClient };