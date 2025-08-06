// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please fill a valid email address',
        ],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false, // Automatically exclude password from query results by default
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
// --- NEW: Notification Preferences ---
    notifications: {
        securityAlerts: {
            unusualActivity: {
                type: Boolean,
                default: true, // Default to true for important security alerts
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
        // You can add more categories here as needed
    },
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});


// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    // Hash the password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare candidate password with the user's password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;