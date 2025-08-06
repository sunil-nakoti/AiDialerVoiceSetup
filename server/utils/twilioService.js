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
    const settings = await Setting.findOne({});
    if (!settings || !settings.accountSID || !settings.authToken) {
      throw new Error('Twilio credentials not found in settings.');
    }
    twilioClientInstance = twilio(settings.accountSID, settings.authToken);
    console.log('Twilio client initialized.');
    return twilioClientInstance;
  } catch (error) {
    twilioClientInstance = null;
    throw new Error(`Failed to initialize Twilio client: ${error.message}`);
  }
};

module.exports = { getTwilioClient };