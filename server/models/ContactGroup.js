const mongoose = require('mongoose');

// ContactGroup model
// This schema represents a logical grouping of contacts. Each group has a
// name, an optional description, a list of contact references, and audit
// timestamps for creation and last update.
const ContactGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook
// Ensure "updatedAt" is always refreshed to the current time before saving
// any changes to a ContactGroup document.
ContactGroupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Export the model so it can be used across the codebase via mongoose.
module.exports = mongoose.model('ContactGroup', ContactGroupSchema);