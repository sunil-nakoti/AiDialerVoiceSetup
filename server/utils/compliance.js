// server/utils/compliance.js
const moment = require('moment-timezone');
const { ComplianceSettings, ComplianceViolation } = require('../models/Compliance');
const CallLog = require('../models/CallLog');

/**
 * Runs all compliance checks for a contact and campaign
 * @param {Object} contact - Contact document
 * @param {Object} campaign - Campaign document
 * @param {Object} complianceSettings - ComplianceSettings document
 * @param {string} dialingPhoneNumber - The specific phone number being dialed for the contact.
 * @returns {Object} { passed: Boolean, reason: String, type: String (e.g., 'DNC', 'TCPA', 'FDCPA') }
 */
async function runAllComplianceChecks(contact, campaign, complianceSettings, dialingPhoneNumber) {
  // Ensure dialingPhoneNumber is provided
  if (!dialingPhoneNumber) {
    console.error("Error: dialingPhoneNumber is missing in runAllComplianceChecks.");
    return { passed: false, reason: 'Internal error: Dialing phone number not provided.', type: 'System' };
  }

  // 1. DNC Check
  if (contact.isDNC) {
    const reason = 'Contact is on Do Not Call list.';
    await logComplianceViolation(contact._id, campaign._id, dialingPhoneNumber, 'DNC', reason);
    return { passed: false, reason, type: 'DNC' };
  }

  // 2. Calling Hours Check (if TCPA enforcement is on)
  if (complianceSettings.enforceTcpa) {
    // Determine the correct time zone for the contact.
    // If contact.timeZone is not available or invalid, default to a sensible timezone, e.g., 'America/New_York'.
    const contactTimeZone = contact.timeZone && moment.tz.zone(contact.timeZone) ? contact.timeZone : 'Asia/Kolkata';
    
    const now = moment().tz(contactTimeZone);
    const [startHour, startMinute] = complianceSettings.callingHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = complianceSettings.callingHours.endTime.split(':').map(Number);
    
    const startTime = now.clone().set({ hour: startHour, minute: startMinute, second: 0, millisecond: 0 });
    const endTime = now.clone().set({ hour: endHour, minute: endMinute, second: 0, millisecond: 0 });

    // Handle overnight calling hours (e.g., 22:00 - 06:00)
    if (startTime.isAfter(endTime)) {
        // If end time is next day, adjust end time to be one day later for comparison
        endTime.add(1, 'day');
    }

    if (now.isBefore(startTime) || now.isAfter(endTime)) {
      const reason = `Call outside allowed hours (${complianceSettings.callingHours.startTime}-${complianceSettings.callingHours.endTime}) in ${contactTimeZone}. Current time: ${now.format('HH:mm Z')}`;
      await logComplianceViolation(contact._id, campaign._id, dialingPhoneNumber, 'TCPA', reason);
      return { passed: false, reason, type: 'TCPA' };
    }
  }

  // 3. Call Attempt Limits (if TCPA or FDCPA enforcement is on)
  if (complianceSettings.enforceTcpa || complianceSettings.enforceFdcpa) {
    const todayStart = moment().startOf('day').toDate();
    // For weekly reset, `startOf('week')` correctly handles this.
    // Make sure your application's locale for moment.js is set if you want week to start on Monday vs Sunday.
    // By default, moment's startOf('week') might be Sunday. If you need Monday, you can set it:
    // moment.updateLocale('en', { week: { dow: 1 } }); // Set Monday as first day of week
    const weekStart = moment().startOf('week').toDate(); 

    // Daily Attempts
    const dailyAttempts = await CallLog.countDocuments({
      contactId: contact._id,
      phoneNumber: dialingPhoneNumber, // Check attempts for the specific number
      createdAt: { $gte: todayStart },
    });
    if (dailyAttempts >= complianceSettings.dailyAttemptsLimit) {
      const reason = `Daily attempt limit (${complianceSettings.dailyAttemptsLimit}) exceeded for ${dialingPhoneNumber}.`;
      await logComplianceViolation(contact._id, campaign._id, dialingPhoneNumber, 'TCPA', reason);
      return { passed: false, reason, type: 'TCPA' };
    }

    // Weekly Attempts
    const weeklyAttempts = await CallLog.countDocuments({
      contactId: contact._id,
      phoneNumber: dialingPhoneNumber, // Check attempts for the specific number
      createdAt: { $gte: weekStart },
    });
    if (weeklyAttempts >= complianceSettings.weeklyAttemptsLimit) {
      const reason = `Weekly attempt limit (${complianceSettings.weeklyAttemptsLimit}) exceeded for ${dialingPhoneNumber}.`;
      await logComplianceViolation(contact._id, campaign._id, dialingPhoneNumber, 'TCPA', reason); // Assuming TCPA covers weekly limits
      return { passed: false, reason, type: 'TCPA' };
    }

    // Total Attempts (across all time)
    const totalAttempts = await CallLog.countDocuments({ 
        contactId: contact._id,
        phoneNumber: dialingPhoneNumber, // Check attempts for the specific number
    });
    if (totalAttempts >= complianceSettings.totalAttemptsLimit) {
      const reason = `Total attempt limit (${complianceSettings.totalAttemptsLimit}) exceeded for ${dialingPhoneNumber}.`;
      await logComplianceViolation(contact._id, campaign._id, dialingPhoneNumber, 'TCPA', reason); // Assuming TCPA covers total limits
      return { passed: false, reason, type: 'TCPA' };
    }
  }

  // If all checks pass
  return { passed: true, reason: 'All compliance checks passed.', type: 'None' };
}

/**
 * Logs a compliance violation
 * @param {string} contactId
 * @param {string} campaignId
 * @param {string} phoneNumber - The specific phone number that caused the violation
 * @param {string} type - Type of violation (e.g., 'DNC', 'TCPA', 'FDCPA')
 * @param {string} reason - Detailed reason for the violation
 */
async function logComplianceViolation(contactId, campaignId, phoneNumber, type, reason) {
  try {
    const violation = new ComplianceViolation({
      phoneNumber,
      type,
      reason,
      // agentId: null, // You can populate this if `processCampaignCalls` has the assigned agent ID readily available
      campaignId,
      contactId,
    });
    await violation.save();
    console.warn(`Compliance violation logged: Contact ${contactId}, Campaign ${campaignId}, Number: ${phoneNumber}, Type: ${type}, Reason: ${reason}`);
  } catch (error) {
    console.error('Error logging compliance violation:', error);
  }
}

module.exports = { runAllComplianceChecks };