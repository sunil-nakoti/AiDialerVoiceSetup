// server/controllers/userController.js

const User = require('../models/User');

const Agent = require('../models/Agent');

const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

const LoginLog = require('../models/LoginLog'); // <--- IMPORT LoginLog model

// Helper function to filter out unwanted fields from req.body
const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) {
            newObj[el] = obj[el];
        }
    });
    return newObj;
};

/**

 * @desc Get current authenticated user's profile

 * @route GET /api/users/profile

 * @access Private

 */

exports.getMe = async (req, res) => {

    console.log("DEBUG-GETME: Function entered.");

    console.log("DEBUG-GETME: Value of req.user at entry point:", req.user);



    try {

        // --- FIX START ---

        // Change 'id' to '_id' in destructuring, and optionally rename it to 'id'

        const { _id: id, role } = req.user;

        // --- FIX END ---



        // Defensive check that caused the 400 error

        if (!id || !role) {

            console.error("DEBUG-GETME: ID or Role is missing from req.user (after destructuring). Sending 400.");

            return res.status(400).json({ message: 'Authentication data (ID or Role) is missing in request.' });

        }



        console.log(`DEBUG-GETME: Attempting to find profile for ID: '${id}', Role: '${role}'`);



        let userProfile;



        if (role === 'admin') {

            userProfile = await User.findById(id).select('-password -__v');

            console.log(`DEBUG-GETME: Searched 'User' (Admin) collection for ID '${id}'. Found: ${userProfile ? 'YES' : 'NO'}`);

            if (userProfile) console.log("DEBUG-GETME: Admin User found (ID):", userProfile._id);

        } else if (role === 'agent') {

            userProfile = await Agent.findById(id).select('-password -__v');

            console.log(`DEBUG-GETME: Searched 'Agent' collection for ID '${id}'. Found: ${userProfile ? 'YES' : 'NO'}`);

            if (userProfile) console.log("DEBUG-GETME: Agent User found (ID):", userProfile._id);

        } else {

            console.warn(`DEBUG-GETME: Invalid user role '${role}' encountered. Sending 403.`);

            return res.status(403).json({ message: 'Invalid user role provided in token.' });

        }



        if (!userProfile) {

            console.error(`DEBUG-GETME: User profile NOT FOUND in database for ID: '${id}' and Role: '${role}'. Sending 404.`);

            return res.status(404).json({ message: 'User profile not found.' });

        }



        console.log("DEBUG-GETME: User profile successfully retrieved from DB. Sending 200.");

        res.status(200).json({

            status: 'success',

            data: {

                user: userProfile,

                role: role,

            },

        });

    } catch (error) {

        console.error("DEBUG-GETME: Error in getMe (catch block):", error.message);

        console.error("DEBUG-GETME: Full error object:", error);

        res.status(500).json({ message: 'Server error fetching user profile.', error: error.message });

    }

};



/**

 * @desc Update current authenticated user's profile

 * @route PUT /api/users/profile

 * @access Private

 */

exports.updateMe = async (req, res) => {

    console.log("DEBUG-UPDATEME: Function entered.");

    console.log("DEBUG-UPDATEME: Value of req.user at entry point:", req.user);



    try {

        // --- FIX START ---

        // Change 'id' to '_id' in destructuring, and optionally rename it to 'id'

        const { _id: id, role } = req.user;

        // --- FIX END ---



        if (!id || !role) {

            console.error("DEBUG-UPDATEME: ID or Role is missing from req.user (after destructuring). Sending 400.");

            return res.status(400).json({ message: 'Authentication data (ID or Role) is missing in request.' });

        }



        const updateData = { ...req.body };

        console.log(`DEBUG-UPDATEME: Attempting to update user with ID: '${id}' and Role: '${role}'. Data:`, updateData);



        let updatedUser;

        const options = { new: true, runValidators: true, select: '-password -__v' };



        if (role === 'admin') {

     const currentUser = await User.findById(id).select('notifications'); // Get current notifications
            // Merge new notifications with existing ones if provided
            if (updateData.notifications && typeof updateData.notifications === 'object') {
                updateData.notifications = { // Direct assignment to updateData.notifications
                    ...(currentUser.notifications ? currentUser.notifications.toObject() : {}), // Existing notifications
                    ...updateData.notifications // New notifications
                };
            }

            if (updateData.email) {

                const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: id } });

                if (existingUser) {

                    console.warn(`DEBUG-UPDATEME: Attempted email update for admin, email '${updateData.email}' already exists for another user.`);

                    return res.status(400).json({ message: 'Email already in use by another admin.' });

                }

            }

            updatedUser = await User.findByIdAndUpdate(id, updateData, options);

            console.log(`DEBUG-UPDATEME: Updated 'User' (Admin) collection for ID '${id}'. Found: ${updatedUser ? 'YES' : 'NO'}`);

            if (updatedUser) console.log("DEBUG-UPDATEME: Admin User updated (ID):", updatedUser._id);

        } else if (role === 'agent') {
     const currentAgent = await Agent.findById(id).select('notifications'); // Get current notifications
           // Merge new notifications with existing ones if provided
            if (updateData.notifications && typeof updateData.notifications === 'object') {
                updateData.notifications = { // Direct assignment to updateData.notifications
                    ...(currentAgent.notifications ? currentAgent.notifications.toObject() : {}),
                    ...updateData.notifications
                };
            }

            if (updateData.email) {

                const existingAgent = await Agent.findOne({ email: updateData.email, _id: { $ne: id } });

                if (existingAgent) {

                    console.warn(`DEBUG-UPDATEME: Attempted email update for agent, email '${updateData.email}' already exists for another agent.`);

                    return res.status(400).json({ message: 'Email already in use by another agent.' });

                }

            }

            updatedUser = await Agent.findByIdAndUpdate(id, updateData, options);

            console.log(`DEBUG-UPDATEME: Updated 'Agent' collection for ID '${id}'. Found: ${updatedUser ? 'YES' : 'NO'}`);

            if (updatedUser) console.log("DEBUG-UPDATEME: Agent User updated (ID):", updatedUser._id);

        } else {

            console.warn(`DEBUG-UPDATEME: Invalid user role '${role}' encountered. Sending 403.`);

            return res.status(403).json({ message: 'Invalid user role.' });

        }



        if (!updatedUser) {

            console.error(`DEBUG-UPDATEME: User profile NOT FOUND or update failed for ID: '${id}' and Role: '${role}' during update. Sending 404.`);

            return res.status(404).json({ message: 'User not found or update failed.' });

        }



        console.log("DEBUG-UPDATEME: User profile successfully updated. Sending 200.");

        res.status(200).json({

            status: 'success',

            message: 'Profile updated successfully.',

            data: {

                user: updatedUser,

                role: role,

            },

        });

    } catch (error) {

        console.error("DEBUG-UPDATEME: Error in updateMe (catch block):", error.message);

        console.error("DEBUG-UPDATEME: Full error object:", error);

        if (error.name === 'ValidationError') {

            const messages = Object.values(error.errors).map(val => val.message);

            return res.status(400).json({ message: messages.join(', ') });

        } else if (error.code === 11000) { // Duplicate key error (e.g., duplicate email)

            return res.status(400).json({ message: 'A user with this email already exists.' });

        }

        res.status(500).json({ message: 'Server error updating user profile.', error: error.message });

    }

};

/**
 * @desc Get login activity logs for the authenticated user
 * @route GET /api/users/login-logs
 * @access Private
 * @param {object} req - Express request object. req.user will be populated by authMiddleware.
 * @param {object} res - Express response object.
 */
exports.getLoginLogs = async (req, res) => {
    console.log("DEBUG-GETLOGINLOGS: Function entered.");
    console.log("DEBUG-GETLOGINLOGS: Value of req.user at entry point:", req.user);

    try {
        const { _id: userId, role } = req.user; // Get user ID and role from authenticated user

        if (!userId || !role) {
            console.error("DEBUG-GETLOGINLOGS: User ID or Role is missing in req.user.");
            return res.status(400).json({ message: 'Authentication data is missing for fetching login logs.' });
        }

        // Fetch login logs for the specific user, sorted by timestamp descending (newest first)
        const loginLogs = await LoginLog.find({ userId: userId, role: role })
                                        .sort({ timestamp: -1 })
                                        .limit(20); // Limit to last 20 activities as per frontend description

        console.log(`DEBUG-GETLOGINLOGS: Retrieved ${loginLogs.length} login logs for user ID: ${userId}, role: ${role}`);
        
        res.status(200).json({
            status: 'success',
            data: loginLogs,
            message: 'Login logs retrieved successfully.'
        });

    } catch (error) {
        console.error("DEBUG-GETLOGINLOGS: Error fetching login logs:", error.message);
        console.error("DEBUG-GETLOGINLOGS: Full error object:", error);
        res.status(500).json({ message: 'Server error fetching login logs.', error: error.message });
    }
};
