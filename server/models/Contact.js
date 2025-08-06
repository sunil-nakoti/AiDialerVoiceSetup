

// server/models/Contact.js

const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
  },
  mailingAddress: { type: String, trim: true },
  mailingCity: { type: String, trim: true },
  mailingState: { type: String, trim: true },
  mailingZip: { type: String, trim: true },
  propertyAddress: { type: String, trim: true },
  propertyCity: { type: String, trim: true },
  propertyState: { type: String, trim: true },
  propertyZip: { type: String, trim: true },
  phone1: { type: String, trim: true },
  phone2: { type: String, trim: true },
  phone3: { type: String, trim: true },
     // --- NEW: Generic City, State, Zip fields ---
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
  isDNC: {
    type: Boolean,
    default: false, // Indicates if contact is on Do Not Call list
  },
  timeZone: {
    type: String,
    default: 'America/New_York', // Default timezone
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContactGroup',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});




ContactSchema.pre('save', function (next) {

  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Contact', ContactSchema);