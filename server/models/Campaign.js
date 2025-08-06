// server/models/Campaign.js
const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
    unique: true,
  },
  contactGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContactGroup',
    required: [true, 'Contact group is required'],
  },
  // callerId: {
  //   type: String,
  //   required: [true, 'Caller ID is required'],
  //   trim: true,
  //   match: [/^\+[1-9]\d{1,14}$/, 'Please enter a valid E.164 phone number format (e.g., +12345678900)'],
  // },
   // CHANGED: From single callerId to an array of callerIds
  callerIds: {
    type: [String], // Array of strings
    required: [true, 'At least one Caller ID is required'],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0 && v.every(id => /^\+[1-9]\d{1,14}$/.test(id));
      },
      message: props => `${props.value} contains invalid or empty Caller IDs. Please ensure all are valid E.164 phone numbers (e.g., +12345678900).`,
    },
  },
  assignedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null,
  },
  callsPerMinute: {
    type: Number,
    required: [true, 'Calls per minute is required'],
    min: 1,
    max: 60,
  },
  status: {
    type: String,
    enum: ['queued', 'running', 'paused', 'completed', 'failed','pending'],
    default: 'queued',
  },
  totalContactsInGroup: {
    type: Number,
    default: 0,
  },
  contactsQueued: {
    type: Number,
    default: 0,
  },
  contactsCalled: {
    type: Number,
    default: 0,
  },
  contactsAnswered: {
    type: Number,
    default: 0,
  },
  contactsCompleted: {
    type: Number,
    default: 0,
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

CampaignSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Campaign', CampaignSchema);