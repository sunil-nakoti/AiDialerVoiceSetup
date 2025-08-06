// server/models/VoiceDialerLog.js
const mongoose = require('mongoose');

const VoiceDialerLogSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact', // Changed from 'ContactInfo' assuming your Contact model is named 'Contact'
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Please enter a valid E.164 phone number format (e.g., +12345678900)'],
  },
  callerId: { // Added based on your controller's `createCampaign` logic
    type: String,
    required: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Please enter a valid E.164 phone number format (e.g., +12345678900)'],
  },
  status: {
    type: String,
    enum: ['queued', 'dialing', 'answered', 'failed', 'no-answer', 'busy', 'canceled', 'dnc-blocked', 'compliance-blocked'], // Added 'queued' and new blocked statuses
    default: 'queued',
  },
  callSid: {
    type: String,
  },
  callDuration: { // Changed from 'duration' to 'callDuration' for consistency with twilioStatusCallback
    type: Number,
  },
  attemptCount: { // <--- ADD THIS FIELD
    type: Number,
    default: 0,
  },
  lastAttemptAt: { // <--- ADD THIS FIELD
    type: Date,
  },
  twilioCallDetails: { // <--- ADD THIS FIELD (used in processCampaignCalls)
    type: Object, // Store raw Twilio webhook body for debugging/auditing
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

VoiceDialerLogSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VoiceDialerLog', VoiceDialerLogSchema);