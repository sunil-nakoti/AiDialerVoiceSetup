// server/controllers/complianceController.js
const { ComplianceSettings, ComplianceViolation } = require('../models/Compliance');
const CallLog = require('../models/CallLog'); // Import CallLog model
const Campaign = require('../models/Campaign'); // Import Campaign model
const Agent = require('../models/Agent');     // Import Agent model
const moment = require('moment-timezone');    // For date calculations
const VoiceDialerLog = require('../models/VoiceDialerLog'); // ADD THIS LINE
const mongoose = require('mongoose'); // Import mongoose to use ObjectId

// --- Middleware ---
// Ensures a single compliance settings document exists in the database.
// If not found, it creates one with default values.
const ensureGlobalSettings = async (req, res, next) => {
    try {
        await ComplianceSettings.getGlobalSettings(); // This static method handles creation if needed
        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        console.error("Error ensuring global compliance settings:", error);
        res.status(500).json({ message: "Server error ensuring compliance settings." });
    }
};

// --- Compliance Settings Handlers ---

/**
 * @desc Get global compliance settings
 * @route GET /api/compliance/settings
 * @access Private (add authentication later)
 */
const getComplianceSettings = async (req, res) => {
    try {
        const settings = await ComplianceSettings.getGlobalSettings();
        res.status(200).json(settings);
    } catch (error) {
        console.error("Error fetching compliance settings:", error);
        res.status(500).json({ message: "Failed to fetch compliance settings." });
    }
};

/**
 * @desc Update global compliance settings
 * @route POST /api/compliance/settings
 * @access Private (add authentication later)
 */
const updateComplianceSettings = async (req, res) => {
    const { dailyAttemptsLimit, weeklyAttemptsLimit, totalAttemptsLimit, enforceTcpa, enforceFdcpa, callingHours } = req.body;
    try {
        // Find the single settings document and update it
        const updatedSettings = await ComplianceSettings.findOneAndUpdate(
            {}, // Empty filter to find the single (or first) document
            {
                dailyAttemptsLimit,
                weeklyAttemptsLimit,
                totalAttemptsLimit,
                enforceTcpa,
                enforceFdcpa,
                callingHours
            },
            { new: true, upsert: true, runValidators: true } // Return the updated doc, create if not exists, run schema validators
        );
        res.status(200).json(updatedSettings);
    } catch (error) {
        console.error("Error updating compliance settings:", error);
        res.status(400).json({ message: "Failed to update compliance settings.", error: error.message });
    }
};

// --- Dialer Statistics and Compliance Metrics Handlers ---

/**
 * @desc Get compliance metrics and general dialer statistics
 * @route GET /api/compliance/metrics
 * @access Private (add authentication later)
 */
// const getComplianceMetrics = async (req, res) => {
//     try {
//         // Use moment-timezone to ensure consistent time calculations, e.g., 'UTC'
//         const now = moment().tz('UTC'); 
//         const startOfDay = now.clone().startOf('day').toDate();
//         const startOfHour = now.clone().startOf('hour').toDate();
//         const startOfMinute = now.clone().subtract(1, 'minute').toDate();

//         // --- Compliance Score Calculation ---
//         const totalCalls = await CallLog.countDocuments();
//         const totalViolations = await ComplianceViolation.countDocuments();
//         let complianceScore = 100;
//         if (totalCalls > 0) {
//             // Calculate score as a percentage of calls without violations
//             complianceScore = Math.max(0, ((totalCalls - totalViolations) / totalCalls) * 100);
//         }

//         // --- Dialer Statistics Calculations ---

//         // Total Calls Today: Count of all calls initiated since the beginning of today
//         const totalCallsToday = await CallLog.countDocuments({
//             createdAt: { $gte: startOfDay }
//         });

//         // Active Campaigns: Count of campaigns currently marked as 'running'
//         const activeCampaigns = await Campaign.countDocuments({ status: 'running' });

//         // Active Calls: Calls that are currently in a state of being processed or connected.
//         // Adjust statuses and time range as per your Twilio webhook logs.
//         const activeCalls = await CallLog.countDocuments({
//             status: { $in: ['initiated', 'dialing', 'ringing', 'in-progress'] },
//             createdAt: { $gte: now.clone().subtract(10, 'minutes').toDate() } // Consider calls from last 10 mins as potentially active
//         });

//         // Connected Agents: Agents who are currently online.
//         // This assumes your Agent model has a 'status' field (e.g., 'online', 'offline').
//         // If not, you might need a different mechanism (e.g., sessions, WebSocket presence).
//         const connectedAgents = await Agent.countDocuments({ status: 'online' });

//         // Failed Calls Today: Calls marked as failed, no-answer, busy, canceled, or blocked today.
//         const failedCallsToday = await CallLog.countDocuments({
//             createdAt: { $gte: startOfDay },
//             status: { $in: ['failed', 'no-answer', 'busy', 'canceled', 'blocked', 'dnc-blocked', 'compliance-blocked'] }
//         });


// // Add these calculations if you want them in getComplianceMetrics
// const totalCampaigns = await Campaign.countDocuments();
// const pausedCampaigns = await Campaign.countDocuments({ status: 'paused' });
// const completedCampaigns = await Campaign.countDocuments({ status: 'completed' });
// const dncBlockedCount = await VoiceDialerLog.countDocuments({ status: 'dnc-blocked' });
// const complianceBlockedCount = await VoiceDialerLog.countDocuments({ status: 'compliance-blocked' });
// // --- NEW: Calculate Total Attempts and Specific Violation Types ---
//         const totalAttempts = await CallLog.countDocuments({}); // Count all calls ever made, across all contacts/numbers

//         const tcpaViolationsCount = await ComplianceViolation.countDocuments({ type: 'TCPA' });
//         const fdcpaViolationsCount = await ComplianceViolation.countDocuments({ type: 'FDCPA' });

//         // Avg. Call Duration: Average duration of answered/completed calls today.
//         // Assumes `callDuration` is stored in seconds.
//         const answeredCompletedCallsToday = await CallLog.aggregate([
//             {
//                 $match: {
//                     createdAt: { $gte: startOfDay },
//                     status: { $in: ['answered', 'completed'] },
//                     callDuration: { $exists: true, $ne: null, $gt: 0 }
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalDuration: { $sum: '$callDuration' },
//                     count: { $sum: 1 }
//                 }
//             }
//         ]);

//         let avgCallDuration = '0:00';
//         if (answeredCompletedCallsToday.length > 0 && answeredCompletedCallsToday[0].count > 0) {
//             const totalDurationSeconds = answeredCompletedCallsToday[0].totalDuration;
//             const averageSeconds = totalDurationSeconds / answeredCompletedCallsToday[0].count;
//             const minutes = Math.floor(averageSeconds / 60);
//             const seconds = Math.floor(averageSeconds % 60);
//             avgCallDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
//         }

//         // Calls Per Minute (CPM): Number of calls that reached a final status (answered, completed, failed, etc.) in the last minute.
//         const callsInLastMinute = await CallLog.countDocuments({
//             createdAt: { $gte: startOfMinute },
//             status: { $in: ['answered', 'completed', 'failed', 'no-answer', 'busy', 'canceled', 'blocked'] }
//         });
//         const callsPerMinuteCurrent = callsInLastMinute; // This is a simple snapshot. For true CPM, you might average over 5-10 minutes.

//         // Success Rate: Percentage of calls that were answered/completed out of total calls today.
//         const connectedCallsToday = await CallLog.countDocuments({
//             createdAt: { $gte: startOfDay },
//             status: { $in: ['answered', 'completed'] }
//         });
//         let successRate = '0.0%';
//         if (totalCallsToday > 0) {
//             successRate = ((connectedCallsToday / totalCallsToday) * 100).toFixed(1) + '%';
//         }
//         // --- NEW: Calculate Compliance Rate based on all calls and all violations ---
//         let overallComplianceRate = '100.0%';
//         if (totalCalls > 0) {
//             // Compliance Rate is (total calls - total violations) / total calls * 100
//             overallComplianceRate = (((totalCalls - totalViolations) / totalCalls) * 100).toFixed(1) + '%';
//         }

//         // Send all calculated stats back to the frontend
//         res.status(200).json({
//             complianceScore: parseFloat(complianceScore.toFixed(1)), // Ensure consistent format for frontend
//             totalCallsToday,
//             activeCampaigns,
//             activeCalls,
//             connectedAgents,
//             failedCalls: failedCallsToday,
//             avgCallDuration,
//             callsPerMinute: callsPerMinuteCurrent,
//             successRate,
//             // --- Add these for the dashboard ---
//     totalCampaigns,
//     pausedCampaigns,
//     completedCampaigns,
//     totalViolations, // This is already calculated at the top as 'totalViolations'
//     dncBlocked: dncBlockedCount,
//     complianceBlocked: complianceBlockedCount,
//     // --- NEW FIELDS ADDED HERE ---
//             totalAttempts, // Send the total attempts
//             tcpaViolations: tcpaViolationsCount, // Send TCPA violation count
//             fdcpaViolations: fdcpaViolationsCount, // Send FDCPA violation count
//             complianceRate: overallComplianceRate, // Send calculated overall compliance rate
//         });

//     } catch (error) {
//         console.error('Error fetching compliance metrics and dialer stats:', error);
//         res.status(500).json({ message: 'Server error fetching metrics.', error: error.message });
//     }
// };

const getComplianceMetrics = async (req, res) => {
    try {
        // Get role and _id from req.user, which is populated by auth middleware
        const { role, _id: userId } = req.user || {}; // Destructure _id as userId for clarity

        // Construct base filters
        let callLogFilter = {};
        let campaignFilter = {};
        let agentFilter = {};
        let complianceViolationFilter = {};
        let voiceDialerLogFilter = {};

        // Apply filters based on role
        if (role === 'agent' && userId) { // Use userId (which is the Agent's _id here)
            // No need to isValid or new ObjectId if it's already from Mongoose
            // If the field that CallLog.agentId, Campaign.assignedAgentId etc. stores is the actual _id of the Agent model
            const agentObjectId = userId; // In this case, userId IS the Agent's _id

            console.log(`Filtering compliance metrics for agent (Agent_ID): ${agentObjectId}`);
            
            callLogFilter.agentId = agentObjectId; // Assuming CallLog's agentId refers to Agent model _id
            
            // This part needs careful consideration based on your Campaign model:
            // If Campaign.assignedAgentId always refers to the Agent's _id, then this is correct.
            // If 'auto' campaigns are not specifically assigned to an agent, you might *not* want to include them in agent-specific stats.
            campaignFilter.$or = [
                { assignedAgentId: agentObjectId },
                // { assignedAgentId: 'auto' } // Remove this if 'auto' campaigns are not agent-specific
            ];

            agentFilter._id = agentObjectId; // Filter Agent model by its _id (to count specific agent's online status)
            complianceViolationFilter.agentId = agentObjectId; // Assuming ComplianceViolation's agentId refers to Agent model _id
            voiceDialerLogFilter.agentId = agentObjectId; // Assuming VoiceDialerLog's agentId refers to Agent model _id
            
        } else if (role === 'admin') {
            console.log('Admin logged in, fetching global compliance metrics.');
            // No filters applied for admin, so they see all data (default empty filters)
        } else {
            // This case should ideally not be hit if route is protected by `protect` middleware
            console.warn('Unknown user role or no user information in req.user. Returning zeroed stats.');
            return res.status(200).json({
                complianceScore: 100, activeCalls: 0, connectedAgents: 0, avgCallDuration: "0:00",
                failedCalls: 0, activeCampaigns: 0, totalCallsToday: 0, successRate: "0.0%",
                callsPerMinute: 0, totalCampaigns: 0, pausedCampaigns: 0, completedCampaigns: 0,
                totalViolations: 0, dncBlocked: 0, complianceBlocked: 0, totalAttempts: 0,
                tcpaViolations: 0, fdcpaViolations: 0, complianceRate: "100.0%",
            });
        }
        
        const now = moment().tz('UTC');
        const startOfDay = now.clone().startOf('day').toDate();
        const startOfMinute = now.clone().subtract(1, 'minute').toDate();

        const totalCalls = await CallLog.countDocuments(callLogFilter);
        const totalViolations = await ComplianceViolation.countDocuments(complianceViolationFilter);
        let complianceScore = 100;
        if (totalCalls > 0) {
            complianceScore = Math.max(0, ((totalCalls - totalViolations) / totalCalls) * 100);
        }

        const totalCallsToday = await CallLog.countDocuments({ ...callLogFilter, createdAt: { $gte: startOfDay } });
        const activeCampaigns = await Campaign.countDocuments({ ...campaignFilter, status: 'running' });
        const activeCalls = await CallLog.countDocuments({
            ...callLogFilter,
            status: { $in: ['initiated', 'dialing', 'ringing', 'in-progress'] },
            createdAt: { $gte: now.clone().subtract(10, 'minutes').toDate() }
        });
        const connectedAgents = await Agent.countDocuments({ ...agentFilter, status: 'online' });
        const failedCallsToday = await CallLog.countDocuments({
            ...callLogFilter,
            createdAt: { $gte: startOfDay },
            status: { $in: ['failed', 'canceled', 'blocked', 'dnc-blocked', 'compliance-blocked'] }
        });

        const totalCampaigns = await Campaign.countDocuments(campaignFilter);
        const pausedCampaigns = await Campaign.countDocuments({ ...campaignFilter, status: 'paused' });
        const completedCampaigns = await Campaign.countDocuments({ ...campaignFilter, status: 'completed' });
        const dncBlockedCount = await VoiceDialerLog.countDocuments({ ...voiceDialerLogFilter, status: 'dnc-blocked' });
        const complianceBlockedCount = await VoiceDialerLog.countDocuments({ ...voiceDialerLogFilter, status: 'compliance-blocked' });
        const totalAttempts = await CallLog.countDocuments(callLogFilter);

        const tcpaViolationsCount = await ComplianceViolation.countDocuments({ ...complianceViolationFilter, type: 'TCPA' });
        const fdcpaViolationsCount = await ComplianceViolation.countDocuments({ ...complianceViolationFilter, type: 'FDCPA' });

        const answeredCompletedCallsToday = await CallLog.aggregate([
            {
                $match: {
                    ...callLogFilter,
                    createdAt: { $gte: startOfDay },
                    status: { $in: ['answered', 'completed'] },
                    callDuration: { $exists: true, $ne: null, $gt: 0 }
                }
            },
            { $group: { _id: null, totalDuration: { $sum: '$callDuration' }, count: { $sum: 1 } } }
        ]);

        let avgCallDuration = '0:00';
        if (answeredCompletedCallsToday.length > 0 && answeredCompletedCallsToday[0].count > 0) {
            const totalDurationSeconds = answeredCompletedCallsToday[0].totalDuration;
            const averageSeconds = totalDurationSeconds / answeredCompletedCallsToday[0].count;
            const minutes = Math.floor(averageSeconds / 60);
            const seconds = Math.floor(averageSeconds % 60);
            avgCallDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        const callsInLastMinute = await CallLog.countDocuments({
            ...callLogFilter,
            createdAt: { $gte: startOfMinute },
            status: { $in: ['answered', 'completed', 'failed', 'no-answer', 'busy', 'canceled', 'blocked'] }
        });
        const callsPerMinuteCurrent = callsInLastMinute;

        const connectedCallsToday = await CallLog.countDocuments({
            ...callLogFilter,
            createdAt: { $gte: startOfDay },
            status: { $in: ['answered', 'completed'] }
        });
        let successRate = '0.0%';
        if (totalCallsToday > 0) {
            successRate = ((connectedCallsToday / totalCallsToday) * 100).toFixed(1) + '%';
        }

        let overallComplianceRate = '100.0%';
        if (totalCalls > 0) {
            overallComplianceRate = (((totalCalls - totalViolations) / totalCalls) * 100).toFixed(1) + '%';
        }

        res.status(200).json({
            complianceScore: parseFloat(complianceScore.toFixed(1)), totalCallsToday,
            activeCampaigns, activeCalls, connectedAgents, failedCalls: failedCallsToday,
            avgCallDuration, callsPerMinute: callsPerMinuteCurrent, successRate,
            totalCampaigns, pausedCampaigns, completedCampaigns, totalViolations,
            dncBlocked: dncBlockedCount, complianceBlocked: complianceBlockedCount,
            totalAttempts, tcpaViolations: tcpaViolationsCount, fdcpaViolations: fdcpaViolationsCount,
            complianceRate: overallComplianceRate,
        });

    } catch (error) {
        console.error('Error fetching compliance metrics and dialer stats:', error);
        res.status(500).json({ message: 'Server error fetching metrics.', error: error.message });
    }
};


// --- Compliance Violations Handlers ---

/**
 * @desc Get all compliance violations
 * @route GET /api/compliance/violations
 * @access Private (add authentication later)
 */
// const getComplianceViolations = async (req, res) => {
//     try {
//         const violations = await ComplianceViolation.find().sort({ timestamp: -1 }); // Sort by newest first
//         res.status(200).json(violations);
//     } catch (error) {
//         console.error("Error fetching compliance violations:", error);
//         res.status(500).json({ message: "Failed to fetch compliance violations." });
//     }
// };

const getComplianceViolations = async (req, res) => {
    try {
        const { role, _id: userId } = req.user || {}; // Destructure _id as userId
        let filter = {};

        if (role === 'agent' && userId) {
            filter.agentId = userId; // Use userId directly
        }

        const violations = await ComplianceViolation.find(filter).sort({ timestamp: -1 });
        res.status(200).json(violations);
    } catch (error) {
        console.error("Error fetching compliance violations:", error);
        res.status(500).json({ message: "Failed to fetch compliance violations." });
    }
};

/**
 * @desc Log a new compliance violation
 * @route POST /api/compliance/violations
 * @access Private (this would primarily be called by your backend dialer logic)
 */
const logComplianceViolation = async (req, res) => {
    const { phoneNumber, type, reason, agentId, campaignId } = req.body;
    try {
        const newViolation = new ComplianceViolation({
            phoneNumber,
            type,
            reason,
            agentId,
            campaignId
        });
        await newViolation.save();
        res.status(201).json(newViolation);
    } catch (error) {
        console.error("Error logging compliance violation:", error);
        res.status(400).json({ message: "Failed to log compliance violation.", error: error.message });
    }
};

/**
 * @desc Export compliance violations to CSV
 * @route GET /api/compliance/violations/export
 * @access Private (add authentication later)
 */
const exportComplianceViolations = async (req, res) => {
    try {
        const { role, _id: userId } = req.user || {}; // Destructure _id as userId
        let filter = {};

        if (role === 'agent' && userId) {
            filter.agentId = userId; // Use userId directly
        }

        const violations = await ComplianceViolation.find(filter).sort({ timestamp: -1 });

        if (violations.length === 0) {
            return res.status(204).send("No violations to export.");
        }

        let csvContent = "Timestamp,Phone Number,Type,Reason,Agent ID,Campaign ID\n";

        violations.forEach(violation => {
            const escapeCsvField = (field) => {
                if (field === null || typeof field === 'undefined') return '';
                let stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            };

            const timestamp = escapeCsvField(new Date(violation.timestamp).toLocaleString());
            const phoneNumber = escapeCsvField(violation.phoneNumber);
            const type = escapeCsvField(violation.type);
            const reason = escapeCsvField(violation.reason);
            const agentIdField = escapeCsvField(violation.agentId);
            const campaignId = escapeCsvField(violation.campaignId);

            csvContent += `${timestamp},${phoneNumber},${type},${reason},${agentIdField},${campaignId}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="compliance_violations.csv"');
        res.status(200).send(csvContent);

    } catch (error) {
        console.error("Error exporting compliance violations:", error);
        res.status(500).json({ message: "Error exporting compliance violations", error: error.message });
    }
};

module.exports = {
    ensureGlobalSettings,
    getComplianceSettings,
    updateComplianceSettings,
    getComplianceMetrics, // This is the updated function
    getComplianceViolations,
    logComplianceViolation,
    exportComplianceViolations
};