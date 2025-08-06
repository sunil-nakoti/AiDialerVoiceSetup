// server/controllers/callLogController.js
const CallLog = require('../models/CallLog');
const mongoose = require('mongoose'); // Make sure mongoose is imported for ObjectId

const formatDuration = (seconds) => {
    const numSeconds = parseInt(seconds, 10);
    if (isNaN(numSeconds) || numSeconds < 0) return '0:00';

    const minutes = Math.floor(numSeconds / 60);
    const remainingSeconds = numSeconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

exports.getCallLogs = async (req, res) => {
    try {
        // --- Authentication Check and User Role/ID Extraction ---
        // req.user should be populated by your authentication middleware (e.g., from a JWT)
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required. No user found in request.' });
        }
        const { _id: authenticatedUserId, role } = req.user; // Get the user's _id and role

        console.log('--- Call Logs API Request ---');
        console.log(`Authenticated User: ID=${authenticatedUserId}, Role=${role}`);

        const pageSize = parseInt(req.query.pageSize) || 10;
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.searchQuery || '';

        console.log(`Received: pageSize=${pageSize}, page=${page}, searchQuery='${searchQuery}'`);

        const skip = (page - 1) * pageSize;

        let baseQuery = {}; // This will be the role-based filter

        // Apply Role-based Filtration (Admin vs. Agent)
        switch (role) {
            case 'admin':
                // Admins see all logs, so baseQuery remains empty
                console.log('Admin user: Fetching all call logs.');
                break;
            case 'agent':
                // Agents see only logs where their agentId matches the authenticated user's _id
                if (!authenticatedUserId) {
                    return res.status(403).json({ message: 'Agent user ID missing from authentication token.' });
                }
                // Ensure the authenticatedUserId is a valid ObjectId before using it in the query
                if (!mongoose.Types.ObjectId.isValid(authenticatedUserId)) {
                    return res.status(400).json({ message: 'Invalid authenticated user ID format.' });
                }
                baseQuery.agentId = new mongoose.Types.ObjectId(authenticatedUserId);
                console.log(`Agent user: Filtering by agentId = ${authenticatedUserId}`);
                break;
            default:
                // If the role is neither 'admin' nor 'agent', deny access
                return res.status(403).json({ message: 'Access denied: Invalid user role for this resource.' });
        }

        // Apply Search Query Filtration, combining with role-based filter
        let finalQuery = { ...baseQuery }; // Start with the role-based query

        if (searchQuery) {
            const searchConditions = {
                $or: [
                    { to: { $regex: searchQuery, $options: 'i' } },
                    { from: { $regex: searchQuery, $options: 'i' } },
                    { status: { $regex: searchQuery, $options: 'i' } },
                    { callType: { $regex: searchQuery, $options: 'i' } },
                    // If you want to search by campaignId or contactId string in the UI
                    // (e.g., if you display part of the ID, though not recommended for search)
                    // { campaignId: { $regex: searchQuery, $options: 'i' } },
                    // { contactId: { $regex: searchQuery, $options: 'i' } },
                    // Note: Searching ObjectId fields directly with $regex can be inefficient
                    // if not indexed or if the search term doesn't look like an ObjectId.
                ]
            };

            // If there's already a base query, combine with $and
            if (Object.keys(baseQuery).length > 0) {
                finalQuery = { $and: [baseQuery, searchConditions] };
            } else {
                // Otherwise, the search condition is the final query
                finalQuery = searchConditions;
            }
            console.log('MongoDB Final Query Object (with search combined):', JSON.stringify(finalQuery));
        } else {
            console.log('MongoDB Final Query Object (no search):', JSON.stringify(finalQuery));
        }

        const totalEntries = await CallLog.countDocuments(finalQuery);
        console.log(`Total documents found in DB matching final query: ${totalEntries}`);

        const callLogs = await CallLog.find(finalQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize);

        console.log(`Documents fetched for current page: ${callLogs.length}`);
        if (callLogs.length > 0) {
            console.log('First fetched call log (raw from DB):', callLogs[0]);
        }

        const totalPages = Math.ceil(totalEntries / pageSize);

        const formattedCallLogs = callLogs.map(log => ({
            _id: log._id,
            time: log.createdAt.toISOString(),
            to: log.to,
            from: log.from,
            type: log.callType,
            duration: formatDuration(log.callDuration),
            recordingUrl: log.callRecordingUrl,
            // Ensure callCost is handled robustly, it comes as a number, format it for display
            cost: log.callCost !== undefined && log.callCost !== null ? `$${log.callCost.toFixed(4)}` : '$0.0000',
            status: log.status,
        }));

        console.log(`Formatted call logs count: ${formattedCallLogs.length}`);
        if (formattedCallLogs.length > 0) {
            console.log('First formatted call log (for frontend):', formattedCallLogs[0]);
        }
        console.log('--- End Call Logs API Request ---');

        res.status(200).json({
            message: 'Call logs retrieved successfully from MongoDB.',
            callLogs: formattedCallLogs,
            totalEntries,
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error('CRITICAL ERROR in getCallLogs backend function:', error);
        // Provide more detailed error for debugging if not in production
        const errorMessage = process.env.NODE_ENV === 'production' ?
                             'Server error while fetching call logs from database.' :
                             `Server error: ${error.message}`;
        res.status(500).json({ message: errorMessage, error: error.message });
    }
};