const mongoose = require('mongoose');

const TwilioNumberSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Please enter a valid E.164 phone number format (e.g., +12345678900)'],
  },
  sid: {
    type: String,
    required: [true, 'Twilio SID is required'],
    unique: true,
    trim: true,
    match: [/^PN[0-9a-fA-F]{32}$/, 'Invalid Twilio Phone Number SID format.'],
  },
  friendlyName: {
    type: String,
    trim: true,
  },
  capabilities: {
    sms: { type: Boolean, default: false },
    voice: { type: Boolean, default: false },
    mms: { type: Boolean, default: false },
    fax: { type: Boolean, default: false },
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'released'],
    default: 'active',
  },
  purchasedAt: {
    type: Date,
    default: Date.now,
  },
  twilioResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  forwardTo: {
    type: String,
    trim: true,
    match: [/^\+[1-9]\d{1,14}$|^$/, 'Please enter a valid E.164 phone number format for forwarding or leave empty'],
    default: '',
  },
  enableRecording: {
    type: Boolean,
    default: false,
  },
  timeout: {
    type: Number,
    default: 10,
    min: [1, 'Timeout must be at least 1 second'],
    max: [60, 'Timeout cannot exceed 60 seconds'],
  },
  voicemailUrl: {
    type: String,
    trim: true,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

TwilioNumberSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TwilioNumber', TwilioNumberSchema);