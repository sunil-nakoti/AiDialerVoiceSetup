// server/controllers/twilioController.js
const Twilio = require('twilio');
const Setting = require('../models/Setting');
const TwilioNumber = require('../models/TwilioNumber');
const Agent = require('../models/Agent');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone'); // ADDED: Import moment for date formatting in export
// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'Uploads/voicemails';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/wav') { // Added WAV support for common audio formats
        cb(null, true);
    } else {
        cb(new Error('Only MP3 or WAV files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

const getTwilioClient = async () => {
    try {
        const settings = await Setting.findOne({});
        if (!settings || !settings.accountSID || !settings.authToken) {
            throw new Error('Twilio API credentials not configured.');
        }
        return new Twilio(settings.accountSID, settings.authToken);
    } catch (error) {
        console.error('Failed to initialize Twilio client:', error.message);
        throw error;
    }
};

const searchAvailableNumbers = async (req, res) => {
    const { areaCode, numberType } = req.query;
    if (!areaCode) {
        return res.status(400).json({ message: 'Area code is required.' });
    }
    if (!/^\d{3}$/.test(areaCode)) {
        return res.status(400).json({ message: 'Invalid area code format.' });
    }
    try {
        const twilioClient = await getTwilioClient();
        const searchOptions = { areaCode };
        let twilioSearchMethod = twilioClient.availablePhoneNumbers('US').local; // Default to US local
        if (numberType === 'local') {
            searchOptions.voiceEnabled = true;
            searchOptions.smsEnabled = true;
        } else if (numberType === 'tollFree') {
            twilioSearchMethod = twilioClient.availablePhoneNumbers('US').tollFree;
        } else if (numberType === 'mobile') {
            searchOptions.mmsEnabled = true;
            twilioSearchMethod = twilioClient.availablePhoneNumbers('US').mobile;
        }
        const availableNumbers = await twilioSearchMethod.list(searchOptions);
        const formattedNumbers = availableNumbers.map(num => ({
            phoneNumber: num.phoneNumber,
            friendlyName: num.friendlyName,
            capabilities: num.capabilities,
            isoCountry: num.isoCountry,
            locality: num.locality,
            region: num.region,
            postalCode: num.postalCode,
            rateCenter: num.rateCenter,
        }));
        res.status(200).json({
            message: `${formattedNumbers.length} available numbers found.`,
            numbers: formattedNumbers,
        });
    } catch (error) {
        console.error(`Error searching numbers: ${error.message}`);
        res.status(500).json({ message: 'Server error while searching numbers.', error: error.message });
    }
};

const purchaseNumbers = async (req, res) => {
    const { numbersToBuy, defaultAgentId } = req.body;
    if (!numbersToBuy || !Array.isArray(numbersToBuy) || numbersToBuy.length === 0) {
        return res.status(400).json({ message: 'No numbers provided for purchase.' });
    }
    let defaultAgent = null;
    if (defaultAgentId) {
        defaultAgent = await Agent.findById(defaultAgentId);
        if (!defaultAgent) {
            return res.status(400).json({ message: 'Invalid default agent ID.' });
        }
    }
    const purchasedResults = [];
    let twilioClient;
    try {
        twilioClient = await getTwilioClient();
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5000';

    for (const numData of numbersToBuy) {
        try {
            if (!numData.phoneNumber) {
                throw new Error('Invalid phone number provided.');
            }

            const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
                phoneNumber: numData.phoneNumber,
                friendlyName: numData.friendlyName || `Purchased number ${numData.phoneNumber}`,
                voiceMethod: 'POST',
            });
            const twilioResponse = JSON.parse(JSON.stringify(purchasedNumber));

            const newTwilioNumber = await TwilioNumber.create({
                phoneNumber: purchasedNumber.phoneNumber,
                sid: purchasedNumber.sid,
                friendlyName: purchasedNumber.friendlyName,
                capabilities: purchasedNumber.capabilities,
                assignedTo: defaultAgentId || null,
                twilioResponse,
            });
            // Now that we have the _id from newTwilioNumber, update the Twilio number's voiceUrl
            const voiceUrl = `${baseUrl}/api/twilio/twiml/${newTwilioNumber._id}`;
            await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).update({
                voiceUrl: voiceUrl,
                voiceMethod: 'POST',
            });

            // Update the voiceUrl in our database as well for consistency
            await TwilioNumber.findByIdAndUpdate(newTwilioNumber._id, { twilioResponse: { ...twilioResponse, voiceUrl: voiceUrl } });

            purchasedResults.push({
                status: 'success',
                phoneNumber: purchasedNumber.phoneNumber,
                dbId: newTwilioNumber._id,
                assignedTo: defaultAgent ? `${defaultAgent.firstName} ${defaultAgent.lastName}` : 'Unassigned',
                voiceUrlConfigured: voiceUrl,
            });
        } catch (error) {
            console.error(`Failed to purchase number ${numData.phoneNumber}: ${error.message}`);
            purchasedResults.push({
                status: 'failed',
                phoneNumber: numData.phoneNumber,
                error: error.message,
            });
        }
    }
    const failedCount = purchasedResults.filter(r => r.status === 'failed').length;
    const successCount = purchasedResults.length - failedCount;
    res.status(successCount > 0 ? 200 : 400).json({
        message: `Purchased ${successCount} number(s), ${failedCount} failed.`,
        results: purchasedResults,
    });
};

const getPurchasedNumbers = async (req, res) => {
    try {
        const purchasedNumbers = await TwilioNumber.find().populate('assignedTo', 'firstName lastName email').sort({ purchasedAt: -1 });
        res.status(200).json({
            message: 'Purchased numbers retrieved successfully.',
            numbers: purchasedNumbers,
        });
    } catch (error) {
        console.error(`Error in getPurchasedNumbers: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching purchased numbers.', error: error.message });
    }
};

const assignNumberToAgent = async (req, res) => {
    const { id } = req.params;
    const { agentId } = req.body;
    if (!agentId) {
        return res.status(400).json({ message: 'Agent ID is required.' });
    }
    try {
        const agent = await Agent.findById(agentId);
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found.' });
        }
        const twilioNumber = await TwilioNumber.findByIdAndUpdate(
            id,
            { assignedTo: agentId },
            { new: true, runValidators: true }
        ).populate('assignedTo', 'firstName lastName email');
        if (!twilioNumber) {
            return res.status(404).json({ message: 'Twilio number not found.' });
        }
        res.status(200).json({
            message: 'Twilio number assigned successfully.',
            phoneNumber: twilioNumber,
        });
    } catch (error) {
        console.error(`Error assigning number: ${error.message}`);
        res.status(500).json({ message: 'Server error while assigning number.', error: error.message });
    }
};

const configureCallForwarding = [
    upload.single('voicemailFile'),
    async (req, res) => {
        const { id } = req.params;
        const { forwardTo, enableRecording, timeout } = req.body;
        try {
            const twilioNumber = await TwilioNumber.findById(id);
            if (!twilioNumber) {
                return res.status(404).json({ message: 'Twilio number not found.' });
            }
            const twilioClient = await getTwilioClient();
            const updateData = {
                forwardTo: forwardTo || '',
                enableRecording: enableRecording === 'true' || enableRecording === true,
                timeout: Number(timeout) || 10,
            };
            if (req.file) {
                updateData.voicemailUrl = `/Uploads/voicemails/${req.file.filename}`; // Updated path to match multer config
            }
            const updatedNumber = await TwilioNumber.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            ).populate('assignedTo', 'firstName lastName email');
            const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5000';
            // The voiceUrl for incoming calls will now direct to the main TwiML endpoint
            // which will handle the Dial verb with an action for voicemail.
            const voiceUrl = updateData.forwardTo ? `${baseUrl}/api/twilio/twiml/${id}` : '';
            await twilioClient.incomingPhoneNumbers(twilioNumber.sid).update({
                voiceUrl: voiceUrl || undefined,
                voiceMethod: 'GET',
            });
            res.status(200).json({
                message: 'Call forwarding configured successfully.',
                phoneNumber: updatedNumber,
            });
        } catch (error) {
            console.error(`Error configuring call forwarding: ${error.message}`);
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ message: 'Server error while configuring call forwarding.', error: error.message });
        }
    },
];

/**
 * @desc Generates TwiML for incoming calls (main endpoint)
 * @route GET /api/twilio/twiml/:id
 * @access Public (called by Twilio)
 */
const getTwiml = async (req, res) => {
    try {
        const { id } = req.params;
        const twilioNumber = await TwilioNumber.findById(id);
        // This comes from the *original* incoming call.
const { From, To, CallSid, CallStatus, Direction } = req.body;        
        const originalCallerNumber = From; 
        if (!twilioNumber) {
            console.warn(`Twilio number with ID ${id} not found for TwiML request.`);
            const twiml = new Twilio.twiml.VoiceResponse();
            twiml.say('This number is not configured correctly. Goodbye.');
            twiml.hangup();
            res.type('text/xml');
            return res.status(404).send(twiml.toString());
        }

        const twiml = new Twilio.twiml.VoiceResponse();
        const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5000';

        if (twilioNumber.forwardTo) {
            const dialOptions = {};
            if (twilioNumber.enableRecording) {
                dialOptions.record = 'record-from-answer';
            }
            // Use the timeout set in the configuration
            dialOptions.timeout = twilioNumber.timeout;

              if (originalCallerNumber) {
                dialOptions.callerId = originalCallerNumber; 
                // So, the recipient +918006258302 will see +918529631475 on their phone.
                console.log(`Incoming call to ${twilioNumber.phoneNumber} from ${originalCallerNumber}. Preparing to forward to ${twilioNumber.forwardTo}, displaying Caller ID: ${originalCallerNumber}`);
            } else {
                console.warn("Original caller number (req.body.From) not found. Falling back to Twilio number as Caller ID.");
                dialOptions.callerId = twilioNumber.phoneNumber; // Fallback to +1234567890 if original is missing
            }

            // --- IMPORTANT CHANGE: Add the 'action' attribute to redirect to voicemail on no answer/busy ---
            // This URL will be called by Twilio if the dial target doesn't answer or is busy.
            dialOptions.action = `${baseUrl}/api/twilio/voicemail-fallback/${id}`;
            dialOptions.method = 'GET'; // Twilio will make a GET request to the fallback URL

            const dial = twiml.dial(dialOptions);
            dial.number(twilioNumber.forwardTo);

            // Removed: twiml.play for voicemail here. It will now be handled by voicemailFallback endpoint.
        } else {
            // If no forwardTo is configured, play a message and hang up
            twiml.say('This number is not configured for forwarding. Please contact support.');
            twiml.hangup();
        }
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error(`Error generating TwiML for incoming call: ${error.message}`);
        const twiml = new Twilio.twiml.VoiceResponse();
        twiml.say('An error occurred. Please try again later.');
        res.type('text/xml');
        res.status(500).send(twiml.toString());
    }
};

/**
 * @desc Handles the voicemail fallback when a call is not answered by the agent.
 * @route GET /api/twilio/voicemail-fallback/:id
 * @access Public (called by Twilio)
 */
const voicemailFallback = async (req, res) => {
    try {
        const { id } = req.params;
        const twilioNumber = await TwilioNumber.findById(id);
        const twiml = new Twilio.twiml.VoiceResponse();
        const baseUrl = process.env.PUBLIC_URL || 'http://localhost:5000';

        if (twilioNumber && twilioNumber.voicemailUrl) {
            console.log(`Playing voicemail for number ID ${id} from URL: ${baseUrl}${twilioNumber.voicemailUrl}`);
            twiml.play(`${baseUrl}${twilioNumber.voicemailUrl}`);
        } else {
            console.log(`No voicemail URL configured for number ID ${id}, or number not found. Playing default message.`);
            twiml.say('Please leave a message after the beep.');
            twiml.record({
                maxLength: 30, // Max 30 seconds for voicemail
                action: `${baseUrl}/api/twilio/record-voicemail-callback`, // Callback for recording completion
                method: 'POST',
                playBeep: true,
            });
            twiml.say('Thank you for your message. Goodbye.'); // Message after recording
        }
        twiml.hangup(); // Hang up after playing or recording

        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error(`Error in voicemail fallback: ${error.message}`);
        const twiml = new Twilio.twiml.VoiceResponse();
        twiml.say('An error occurred with the voicemail service. Goodbye.');
        twiml.hangup();
        res.type('text/xml');
        res.status(500).send(twiml.toString());
    }
};

/**
 * @desc Handles the callback after a voicemail recording is completed.
 * @route POST /api/twilio/record-voicemail-callback
 * @access Public (called by Twilio)
 */
const recordVoicemailCallback = async (req, res) => {
    const { CallSid, RecordingUrl, RecordingDuration } = req.body;
    console.log(`Voicemail recorded for Call SID: ${CallSid}. Recording URL: ${RecordingUrl}, Duration: ${RecordingDuration} seconds.`);

    // TODO: Implement logic to save RecordingUrl and RecordingDuration to your database (e.g., in CallLog or a dedicated VoicemailLog model)
    // You'd likely want to associate this with the original incoming call or the agent.
    // Example:
    /*
    try {
        await VoicemailLog.create({
            callSid: CallSid,
            recordingUrl: RecordingUrl,
            duration: RecordingDuration,
            timestamp: new Date(),
            // You might need to retrieve more context like the original 'To' number
            // or the agent it was trying to reach from CallSid in CallLog.
        });
        console.log("Voicemail recording saved to DB.");
    } catch (error) {
        console.error("Error saving voicemail recording to DB:", error);
    }
    */

    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.say('Your message has been received.');
    twiml.hangup();
    res.type('text/xml');
    res.send(twiml.toString());
};
/**
 * @desc Export all purchased Twilio numbers to CSV
 * @route GET /api/twilio/export
 * @access Private (Admin only, or relevant role)
 */
const exportPurchasedNumbers = async (req, res) => {
    try {
        // No role-based filtering as requested, fetch all numbers
        const numbers = await TwilioNumber.find().populate('assignedTo', 'firstName lastName').sort({ createdAt: -1 });

        if (numbers.length === 0) {
            return res.status(204).send("No purchased numbers to export."); // 204 No Content
        }

        let csvContent = "Phone Number,Friendly Name,Assigned To,Forward To,Enable Recording,Timeout,Voicemail URL,Capabilities,Status,Created At\n";

        const escapeCsvField = (field) => {
            if (field === null || typeof field === 'undefined') return '';
            let stringField = String(field);
            // Escape double quotes by doubling them, then wrap field in double quotes if it contains
            // commas, double quotes, or newlines.
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        numbers.forEach(num => {
            const phoneNumber = escapeCsvField(num.phoneNumber);
            const friendlyName = escapeCsvField(num.friendlyName);
            const assignedTo = escapeCsvField(num.assignedTo ? `${num.assignedTo.firstName} ${num.assignedTo.lastName}` : 'Unassigned');
            const forwardTo = escapeCsvField(num.forwardTo);
            const enableRecording = escapeCsvField(num.enableRecording ? 'Yes' : 'No');
            const timeout = escapeCsvField(num.timeout);
            const voicemailUrl = escapeCsvField(num.voicemailUrl);
            const capabilities = escapeCsvField(Object.entries(num.capabilities).filter(([, value]) => value).map(([key]) => key).join(', '));
            const status = escapeCsvField(num.status);
            const createdAt = escapeCsvField(moment(num.createdAt).format('YYYY-MM-DD HH:mm:ss'));

            csvContent += `${phoneNumber},${friendlyName},${assignedTo},${forwardTo},${enableRecording},${timeout},${voicemailUrl},${capabilities},${status},${createdAt}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="purchased_twilio_numbers.csv"');
        res.status(200).send(csvContent);

    } catch (error) {
        console.error("Error exporting purchased Twilio numbers:", error);
        res.status(500).json({ message: "Error exporting purchased Twilio numbers", error: error.message });
    }
};

module.exports = {
    searchAvailableNumbers,
    purchaseNumbers,
    getPurchasedNumbers,
    assignNumberToAgent,
    configureCallForwarding,
    getTwiml,
    voicemailFallback, // Export the new function
    recordVoicemailCallback, // Export the new function for recording callback
    exportPurchasedNumbers, // EXPORTED: The new function
};
