// server/models/LoginLog.js
const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
    // Store the ID of the user (Admin or Agent) who logged in
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // We don't use 'ref' here directly as it could be either User or Agent.
        // We'll manage this logic in the controllers.
    },
    // Store the role of the user (admin or agent)
    role: {
        type: String,
        required: true,
        enum: ['admin', 'agent'], // Enforce allowed roles
    },
    // Timestamp of the login event
    timestamp: {
        type: Date,
        default: Date.now,
    },
    // Information about the IP address from which the login occurred
    ipAddress: {
        type: String,
        trim: true,
    },
    // Basic user agent string to identify device/browser
    userAgent: {
        type: String,
        trim: true,
    },
    // Could store success/failure if you want to log failed attempts too
    status: {
        type: String,
        enum: ['success', 'failure'],
        default: 'success',
    },
    // Additional details if needed (e.g., location, device type)
    details: {
        type: String,
        trim: true,
        maxlength: 255,
    },
});

// Create an index for faster lookups by userId and timestamp
loginLogSchema.index({ userId: 1, timestamp: -1 });

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

module.exports = LoginLog;