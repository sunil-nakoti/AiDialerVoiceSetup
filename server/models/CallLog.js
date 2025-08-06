// server/models/CallLog.js
const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true,
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Please enter a valid E.164 phone number format (e.g., +12345678900)'],
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null,
  },
  callSid: {
    type: String,
    unique: true,
    sparse: true,
  },
  status: {
    type: String,
    enum: ['initiated', 'dialing', 'answered', 'no-answer', 'busy', 'failed', 'completed', 'dnc-blocked', 'compliance-blocked'],
    default: 'initiated',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // --- New Fields Below ---
    to: { // The recipient's phone number (customer)
        type: String,
        trim: true,
    },
    from: { // The caller's phone number (your Twilio number)
        type: String,
        trim: true,
    },
    callDuration: { // Duration in seconds, provided by Twilio
        type: Number,
        default: 0,
    },
    callRecordingUrl: { // URL to the call recording, if enabled
        type: String,
        default: null,
    },
    callCost: { // Cost of the call, provided by Twilio
        type: Number,
        default: 0,
    },
    callType: { // 'outbound' for calls initiated by your dialer, 'inbound' for incoming calls
        type: String,
        enum: ['outbound', 'inbound'],
        default: 'outbound', // Most calls from this dialer will be outbound
    },
    twilioCallDetails: { // Store the raw Twilio webhook body for comprehensive debugging/auditing
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    // --- New Fields End ---
});

CallLogSchema.index({ contactId: 1, createdAt: 1 });

module.exports = mongoose.model('CallLog', CallLogSchema);