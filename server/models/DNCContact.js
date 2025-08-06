const mongoose = require('mongoose');

const dncContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: 'Customer Request',
  },
});

module.exports = mongoose.model('DNCContact', dncContactSchema);