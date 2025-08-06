const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const agentSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  // --- NEW FIELDS FOR PROFILE DETAILS ---
    phone: {
        type: String,
        trim: true,
        default: '',
    },
    dob: { // Date of Birth
        type: Date,
        default: null, // Store as Date object
    },
    addressLine1: {
        type: String,
        trim: true,
        default: '',
    },
    addressLine2: {
        type: String,
        trim: true,
        default: '',
    },
    state: {
        type: String,
        trim: true,
        default: '',
    },
    country: {
        type: String,
        trim: true,
        default: '',
    },
    // --- NEW FIELDS FOR PREFERENCES ---
    language: {
        type: String,
        default: 'en-US', // Example default: English (United States)
    },
    dateFormat: {
        type: String,
        default: 'MM/DD/YYYY', // Example default: Month/Day/Year
    },
    // --- END NEW FIELDS ---
    createdAt: {
        type: Date,
        default: Date.now,
    },
    

  updatedAt: {
    type: Date,
    default: Date.now,
  },
   // --- ENSURE 'notifications' FIELD IS PRESENT LIKE THIS ---
    notifications: {
        securityAlerts: {
            unusualActivity: {
                type: Boolean,
                default: true,
            },
            newBrowserSignIn: {
                type: Boolean,
                default: false,
            },
        },
        newsUpdates: {
            salesAndNews: {
                type: Boolean,
                default: true,
            },
            newFeatures: {
                type: Boolean,
                default: false,
            },
            accountTips: {
                type: Boolean,
                default: true,
            },
        },
    },
}, {
    timestamps: true


});

// Pre-save hook to hash password before saving
agentSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Update updatedAt on update
agentSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Agent', agentSchema);