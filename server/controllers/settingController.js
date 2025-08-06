// server/controllers/settingController.js
const Setting = require('../models/Setting');
// const { protect } = require('../middleware/authMiddleware'); // Uncomment if you have auth middleware

// Helper for professional validation
const validateSettingsInput = (accountSID, authToken) => {
    const errors = [];

    if (!accountSID || typeof accountSID !== 'string' || accountSID.trim() === '') {
        errors.push('Account SID is required.');
    } else if (accountSID.trim().length < 30 || accountSID.trim().length > 40) { // Example length check
        errors.push('Account SID must be between 30 and 40 characters.');
    }
    // Optional: Add regex validation for Account SID
    // else if (!accountSidRegex.test(accountSID.trim())) {
    //    errors.push('Invalid Account SID format.');
    // }

    if (!authToken || typeof authToken !== 'string' || authToken.trim() === '') {
        errors.push('Auth Token is required.');
    } else if (authToken.trim().length !== 32) { // Twilio Auth Token is typically 32 chars
        errors.push('Auth Token must be 32 characters long.');
    }
    // Optional: Add regex validation for Auth Token
    // else if (!authTokenRegex.test(authToken.trim())) {
    //    errors.push('Invalid Auth Token format.');
    // }

    return errors;
};


// @desc    Get API settings
// @route   GET /api/settings
// @access  Private (if authenticated users have their own settings)
exports.getSettings = async (req, res) => {
    try {
        // If you're associating settings with users, use req.user.id or similar
        // const settings = await Setting.findOne({ userId: req.user.id });
        const settings = await Setting.findOne({}); // For a single, global setting or without user auth

        if (!settings) {
            return res.status(200).json({
                message: 'No API settings found. Please configure them.',
                accountSID: '',
                authToken: '', // Will be an empty string if no settings are found
                provider: 'Twilio'
            });
        }

        // The authToken will be decrypted automatically by the Mongoose post-find hook
        res.status(200).json({
            message: 'API settings retrieved successfully.',
            accountSID: settings.accountSID,
            authToken: settings.authToken,
            provider: settings.provider,
        });
    } catch (error) {
        console.error(`Error in getSettings: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching settings.', error: error.message });
    }
};

// @desc    Create or Update API settings
// @route   POST /api/settings
// @access  Private (if authenticated users have their own settings)
exports.saveSettings = async (req, res) => {
    const { accountSID, authToken, provider } = req.body;

    // Professional validation
    const validationErrors = validateSettingsInput(accountSID, authToken);
    if (validationErrors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
    }

    try {
        // Find the existing document. The post-find hook will decrypt authToken here.
        let settings = await Setting.findOne({});

        if (settings) {
            // Update existing settings by modifying the document instance
            settings.accountSID = accountSID.trim();
            // Assign the new plaintext token. Mongoose will recognize this as a modification.
            settings.authToken = authToken.trim();
            settings.provider = provider || 'Twilio';

            // Save the document. This will trigger the pre('save') hook for encryption.
            await settings.save();
            console.log("Settings updated via save(). Auth token should be encrypted now.");
        } else {
            // Create new settings. The pre('save') hook will encrypt the token before creation.
            settings = await Setting.create({
                accountSID: accountSID.trim(),
                authToken: authToken.trim(),
                provider: provider || 'Twilio',
            });
            console.log("New settings created via create(). Auth token should be encrypted now.");
        }

        // Respond without sending back the decrypted token
        res.status(200).json({
            message: settings ? 'API settings updated successfully!' : 'API settings saved successfully!',
            settings: {
                accountSID: settings.accountSID,
                authToken: '••••••••••••••••••••••••••••••••' // Mask the token for response
            }
        });
    } catch (error) {
        console.error(`Error in saveSettings: ${error.message}`);
        // Handle Mongoose validation errors specifically
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation Error', errors: errors });
        }
        // Handle encryption errors that might be thrown from pre-save hook
        if (error.message.includes('Failed to encrypt Auth Token.')) {
            return res.status(500).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error while saving settings.', error: error.message });
    }
};

// @desc    Verify API credentials (Optional, for backend validation with external API)
// @route   POST /api/settings/verify
// @access  Private
exports.verifyCredentials = async (req, res) => {
    const { accountSID, authToken, provider } = req.body;

    const validationErrors = validateSettingsInput(accountSID, authToken);
    if (validationErrors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
    }

    console.log(`Attempting to verify credentials for provider: ${provider}, SID: ${accountSID}`);

    try {
        // --- SIMULATED VERIFICATION (for now) ---
        const isValid = await new Promise(resolve => setTimeout(() => {
            // Simple simulation: valid if SID starts with AC and not "ERROR"
            if (accountSID.startsWith('AC') && authToken.length === 32 && authToken !== "ERROR") {
                resolve(true);
            } else {
                resolve(false);
            }
        }, 1500)); // Simulate network delay

        if (isValid) {
            res.status(200).json({ success: true, message: 'Credentials verified successfully (simulated)!' });
        } else {
            res.status(400).json({ success: false, message: 'Credential verification failed. Please check your inputs.' });
        }
    } catch (error) {
        console.error(`Error in verifyCredentials: ${error.message}`);
        res.status(500).json({ success: false, message: 'An internal server error occurred during verification.', error: error.message });
    }
};