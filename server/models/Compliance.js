// server/models/Compliance.js
const mongoose = require('mongoose');

// --- Compliance Settings Schema ---
const complianceSettingsSchema = new mongoose.Schema({
    dailyAttemptsLimit: {
        type: Number,
        default: 50,
        min: 0
    },
    weeklyAttemptsLimit: {
        type: Number,
        default: 250,
        min: 0
    },
    totalAttemptsLimit: {
        type: Number,
        default: 10000,
        min: 0
    },
    enforceTcpa: {
        type: Boolean,
        default: true
    },
    enforceFdcpa: {
        type: Boolean,
        default: true
    },
    callingHours: {
        startTime: {
            type: String, // Stored as "HH:MM" string (e.g., "08:00")
            default: '08:00',
            match: /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/ // Regex for 24-hour HH:MM format
        },
        endTime: {
            type: String, // Stored as "HH:MM" string (e.g., "21:00")
            default: '21:00',
            match: /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/
        }
    },
    // Add any other global compliance settings here
}, { timestamps: true });

// Static method to ensure a single settings document exists and retrieve it
complianceSettingsSchema.statics.getGlobalSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        // If no settings exist, create default ones
        settings = await this.create({}); // Creates a document with all default values
    }
    return settings;
};

const ComplianceSettings = mongoose.model('ComplianceSettings', complianceSettingsSchema);

// --- Compliance Violation Schema (for logging individual violations) ---
const complianceViolationSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    phoneNumber: {
        type: String,
        required: true
    },
    type: { // e.g., 'TCPA', 'FDCPA', 'Internal Policy'
        type: String,
        required: true
    },
    reason: { // e.g., 'Called outside allowed hours', 'Exceeded daily limit'
        type: String,
        required: true
    },
    agentId: { // Optional: if tracking which agent caused the violation
        type: mongoose.Schema.Types.ObjectId, // Assuming you have a User model, or just String
        ref: 'User'
    },
    campaignId: { // Optional: if tracking which campaign caused the violation
        type: mongoose.Schema.Types.ObjectId, // Assuming you have a Campaign model
        ref: 'Campaign'
    }
});

const ComplianceViolation = mongoose.model('ComplianceViolation', complianceViolationSchema);

module.exports = { ComplianceSettings, ComplianceViolation };