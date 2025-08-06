const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryptionUtil'); // Import utility

const SettingSchema = new mongoose.Schema({
  // If you're associating settings with a specific user:
  // userId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: true,
  //   unique: true // Ensure each user has only one settings entry
  // },
  accountSID: {
    type: String,
    required: [true, 'Account SID is required'], // Professional validation message
    trim: true,
    minlength: [30, 'Account SID must be at least 30 characters long'], // Example min length
    maxlength: [40, 'Account SID cannot exceed 40 characters'], // Example max length
    // You could add a regex for Twilio SID format here:
    // match: /^AC[0-9a-fA-F]{32}$/ // Twilio Account SID format
  },
  // Store authToken as encrypted string
  authToken: {
    type: String,
    required: [true, 'Auth Token is required'], // Still required logically, handled before encryption
    trim: true,
  },
  provider: {
    type: String,
    enum: {
      values: ['Twilio'], // You can add 'Vonage', etc.
      message: 'Provider must be Twilio or a valid option.',
    },
    default: 'Twilio',
    required: true,
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

// --- Pre-save hook for encryption ---
SettingSchema.pre('save', function(next) {
  if (this.isModified('authToken') && this.authToken) {
    try {
      this.authToken = encrypt(this.authToken);
    } catch (error) {
      return next(new Error('Failed to encrypt Auth Token.'));
    }
  }
  this.updatedAt = Date.now();
  next();
});

// --- Post-find hook for decryption (when retrieving from DB) ---
SettingSchema.post('findOne', function(doc) {
  if (doc && doc.authToken) {
    try {
      doc.authToken = decrypt(doc.authToken);
    } catch (error) {
      console.error('Error decrypting Auth Token for document:', doc._id, error);
      // Optionally, handle this by clearing the token or returning an error to the user
      doc.authToken = null; // Clear if decryption fails to prevent sending encrypted data
    }
  }
});

SettingSchema.post('find', function(docs) {
    docs.forEach(doc => {
        if (doc && doc.authToken) {
            try {
                doc.authToken = decrypt(doc.authToken);
            } catch (error) {
                console.error('Error decrypting Auth Token for document:', doc._id, error);
                doc.authToken = null;
            }
        }
    });
});

module.exports = mongoose.model('Setting', SettingSchema);