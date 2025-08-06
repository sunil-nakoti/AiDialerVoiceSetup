// server/controllers/dashboardController.js
const Campaign = require('../models/Campaign');
const CallLog = require('../models/CallLog');
const Agent = require('../models/Agent');
const VoiceDialerLog = require('../models/VoiceDialerLog');
const { ComplianceViolation } = require('../models/Compliance'); // Assuming this model exists

/**
 * @desc Get all dashboard statistics
 * @route GET /api/dashboard/stats
 * @access Private (implement authentication middleware as needed)
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // --- Call Statistics ---
        const activeCallsCount = await CallLog.countDocuments({
            status: { $in: ['dialing', 'ringing', 'answered'] }
        });

        // Assuming 'online' status for agents means connected
        const connectedAgentsCount = await Agent.countDocuments({ status: 'online' });

        // Calculate Average Call Duration for completed calls
        const totalCallDurationResult = await CallLog.aggregate([
            { $match: { status: 'completed', callDuration: { $exists: true, $ne: null } } },
            { $group: { _id: null, total: { $sum: '$callDuration' }, count: { $sum: 1 } } }
        ]);
        const avgCallDurationSeconds = totalCallDurationResult.length > 0
            ? Math.round(totalCallDurationResult[0].total / totalCallDurationResult[0].count)
            : 0;

        const failedCallsCount = await CallLog.countDocuments({
            status: { $in: ['failed', 'no-answer', 'busy', 'canceled'] }
        });

        // --- Campaign Overview ---
        const totalCampaigns = await Campaign.countDocuments();
        const runningCampaigns = await Campaign.countDocuments({ status: 'running' });
        const pausedCampaigns = await Campaign.countDocuments({ status: 'paused' });
        const completedCampaigns = await Campaign.countDocuments({ status: 'completed' });

        // --- Compliance Statistics ---
        // Count overall compliance violations (if you have a ComplianceViolation model that logs them)
        const complianceViolationsCount = await ComplianceViolation.countDocuments();
        // Count DNC blocked calls from VoiceDialerLog
        const dncBlockedCount = await VoiceDialerLog.countDocuments({ status: 'dnc-blocked' });
        // Count other compliance blocked calls from VoiceDialerLog
        const complianceBlockedCount = await VoiceDialerLog.countDocuments({ status: 'compliance-blocked' });

        // --- Aggregated Calls Per Minute (CPM) from active campaigns ---
        // This will show the average CPM of all currently 'running' campaigns.
        const runningCampaignsForCPM = await Campaign.find({ status: 'running' }, 'callsPerMinute');
        let aggregatedCPM = 0;
        if (runningCampaignsForCPM.length > 0) {
            const sumCPM = runningCampaignsForCPM.reduce((sum, campaign) => sum + campaign.callsPerMinute, 0);
            aggregatedCPM = Math.round(sumCPM / runningCampaignsForCPM.length);
        }

        res.status(200).json({
            message: 'Dashboard statistics retrieved successfully.',
            stats: {
                calls: {
                    active: activeCallsCount,
                    connectedAgents: connectedAgentsCount,
                    avgCallDurationSeconds: avgCallDurationSeconds,
                    failed: failedCallsCount,
                },
                campaigns: {
                    total: totalCampaigns,
                    running: runningCampaigns,
                    paused: pausedCampaigns,
                    completed: completedCampaigns,
                },
                compliance: {
                    violations: complianceViolationsCount,
                    dncBlocked: dncBlockedCount,
                    complianceBlocked: complianceBlockedCount,
                },
                system: {
                    aggregatedCPM: aggregatedCPM,
                },
                sms: { // Static SMS data as requested
                    sent: 0,
                    delivered: 0,
                    failed: 0,
                    queued: 0,
                }
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        res.status(500).json({ message: 'Server error while fetching dashboard statistics.', error: error.message });
    }
};