// server/utils/cleanupService.js
const CallLog = require('../models/CallLog');
const moment = require('moment-timezone'); // Ensure moment-timezone is installed

/**
 * Deletes CallLog entries older than a specified duration.
 * @param {number} daysToRetain - Number of days to keep CallLog entries. Defaults to 30.
 */
async function cleanOldCallLogs(daysToRetain = 30) {
    try {
        const cutoffDate = moment().subtract(daysToRetain, 'days').toDate(); 

        const result = await CallLog.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        console.log(`CallLog Cleanup: Successfully removed ${result.deletedCount} entries older than ${daysToRetain} days.`);
    } catch (error) {
        console.error('CallLog Cleanup Error:', error);
    }
}

module.exports = { cleanOldCallLogs };