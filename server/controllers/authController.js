// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Make sure bcrypt is imported
const LoginLog = require('../models/LoginLog'); // <--- IMPORT LoginLog

// Function to sign JWT
// Will now include the role
const signToken = (id) => {
    return jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET, { // <--- ADDED role: 'admin'
        expiresIn: '30d',
    });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Basic Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password.' });
        }

        // 2. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use. Please use another email or login.' });
        }

        // 3. Create new user (password will be hashed by the pre-save hook in User.js)
        const newUser = await User.create({
            name,
            email,
            password,
        });
         const userRole = 'admin'; // Explicitly define role for new admin user

        // 4. Generate token
        const token = signToken(newUser._id, userRole);

         // Convert Mongoose document to plain object and add role
        const userForResponse = newUser.toObject();
        delete userForResponse.password;
        userForResponse.role = userRole; // Add the role property to the response object
        // --- NEW: Log the registration as a successful login (optional, or adjust to 'register' status) ---
        // For simplicity, we'll log it as a successful login event.
        await LoginLog.create({
            userId: newUser._id,
            role: userRole,
            ipAddress: req.ip, // Capture IP address
            userAgent: req.headers['user-agent'], // Capture user agent string
            status: 'success',
            details: 'Admin registration and initial login',
        });
        // --- END NEW ---

        res.status(201).json({
            status: 'success',
            token,
            data: {
                 user: userForResponse,
            },
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        if (error.name === 'ValidationError') {
            // Mongoose validation error
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        res.status(500).json({ message: 'An error occurred during registration. Please try again later.' });
    }
};

// LOGIN FUNCTION
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password!' });
        }

        // 2. Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password'); // Explicitly select password

        if (!user) {
            return res.status(401).json({ message: 'Incorrect email or password.' });
        }

        // Use the comparePassword method from the User model
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect email or password.' });
        }

          const userRole = 'admin'; // Explicitly define role for logged-in admin user
        const token = signToken(user._id, userRole);

        // Convert Mongoose document to plain object and add role
        const userForResponse = user.toObject();
        delete userForResponse.password;
        userForResponse.role = userRole; 

        // --- NEW: Log the successful login event ---
        await LoginLog.create({
            userId: user._id,
            role: userRole,
            ipAddress: req.ip, // Capture IP address
            userAgent: req.headers['user-agent'], // Capture user agent string
            status: 'success',
            details: 'Admin successful login',
        });
        // --- END NEW ---

        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: userForResponse
            },
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: 'An error occurred during login. Please try again later.' });
    }
};
exports.logout = (req, res) => {
    res.status(200).json({ status: "success", message: "Logged out successfully" });
};

// --- NEW: Admin Password Update Function ---
exports.updatePassword = async (req, res) => {
    try {
        // req.user is populated by your authentication middleware (e.g., protect route)
        // FIX: Use req.user._id instead of req.user.id as populated by Mongoose object
const userId = req.user._id;
        console.log('Controller: userId from req.user.id:', userId); // <--- NEW DEBUG LOG
        
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ message: 'Please provide current password, new password, and confirm new password.' });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: 'New password and confirm new password do not match.' });
        }

        const user = await User.findById(userId).select('+password');

        if (!user) {
            console.error('Controller: User.findById returned null for userId:', userId); // <--- NEW DEBUG LOG
            return res.status(404).json({ message: 'sunil User not found.' });
        }

        // Verify current password
        const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordCorrect) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        // Update password (pre-save hook in User model will hash it)
        user.password = newPassword;
        await user.save();

        // Optionally, re-issue a new token if you want to invalidate old sessions
        const newToken = signToken(user._id, 'admin');

        res.status(200).json({
            status: 'success',
            message: 'Password updated successfully.',
            token: newToken // Send new token if re-issued
        });

    } catch (error) {
        console.error("UPDATE ADMIN PASSWORD ERROR:", error);
        res.status(500).json({ message: 'Failed to update password. Please try again later.', error: error.message });
    }
};