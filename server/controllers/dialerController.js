// server/controllers/dialerController.js
const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const ContactGroup = require('../models/ContactGroup');
const VoiceDialerLog = require('../models/VoiceDialerLog');
const CallLog = require('../models/CallLog'); // New model for tracking call attempts
const { ComplianceSettings, ComplianceViolation } = require('../models/Compliance');
const { getTwilioClient } = require('../utils/twilioService');
const { runAllComplianceChecks } = require('../utils/compliance');
const TwilioNumber = require('../models/TwilioNumber'); // Add this import
const Agent = require('../models/Agent');
const Twilio = require('twilio');
const moment = require('moment-timezone');
const axios = require('axios');
const mongoose = require('mongoose'); // <--- ADD THIS LINE
const DNCContact = require('../models/DNCContact');
// Map to store active campaign workers
const activeCampaignWorkers = new Map();


// --- Discord Webhook Configuration ---
// IMPORTANT: Replace with your actual Discord Webhook URL.
// It's highly recommended to store this in an environment variable (e.g., process.env.DISCORD_WEBHOOK_URL)
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discordapp.com/api/webhooks/1385202211658797147/n2wVn2RTiqbli7P7v0Wdj8cySomF5E0KJ-KgMdGhHKQSM0_hnukAYNw-Z5U4X9gPeUSP';
if (!DISCORD_WEBHOOK_URL) {
    console.warn("DISCORD_WEBHOOK_URL is not set in environment variables. Discord notifications will not work.");
}

/**
 * @desc Create a new campaign and populate VoiceDialerLog
 * @route POST /api/dialer/campaigns
 * @access Private
 */

// Helper function to normalize phone numbers
const normalizePhoneNumber = (phone) => {
    if (!phone) return null;
    const trimmed = phone.trim().replace(/[^\d+]/g, '');
    if (/^\d{10}$/.test(trimmed)) return `+1${trimmed}`;
    if (/^0\d{10}$/.test(trimmed)) return `+1${trimmed.slice(1)}`;
    if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return trimmed;
    return null;
};

const processContactsInBackground = async (campaignId, contactGroupId, campaignCallerIds) => {
    console.log(`[Background Job] Starting optimized contact processing for Campaign: ${campaignId}`);
    try {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return console.error(`[Background Job] Campaign ${campaignId} not found.`);

        const BATCH_SIZE = 10000;
        let skip = 0, totalProcessed = 0, totalQueued = 0, totalDNCBlocked = 0, totalInvalidSkipped = 0, callerIdIndex = 0;

        // Preload DNC entries and normalize
        const dncSet = new Set((await DNCContact.find({}, { phone: 1 })).flatMap(({ phone }) => {
            const norm = normalizePhoneNumber(phone);
            return norm ? [norm, norm.slice(3)] : [];
        }));

        // Preload all existing logs for deduplication
        const existingLogs = await VoiceDialerLog.find({ campaignId }, { contactId: 1, phoneNumber: 1 });
        const existingLogSet = new Set(existingLogs.map(log => `${log.contactId}_${log.phoneNumber}`));

        // Store contact group size
        campaign.totalContactsInGroup = await Contact.countDocuments({ groups: contactGroupId });
        await campaign.save();

        while (true) {
            const contactsBatch = await Contact.find({ groups: contactGroupId }).skip(skip).limit(BATCH_SIZE).lean();
            if (!contactsBatch.length) break;

            const logsToInsert = [];

            for (const contact of contactsBatch) {
                const uniquePhones = [...new Set([contact.phone1, contact.phone2, contact.phone3].filter(Boolean))];

                for (const phone of uniquePhones) {
                    const normalizedPhone = normalizePhoneNumber(phone);
                    totalProcessed++;

                    if (!normalizedPhone) {
                        totalInvalidSkipped++;
                        continue;
                    }

                    const logKey = `${contact._id}_${normalizedPhone}`;
                    if (existingLogSet.has(logKey)) continue;

                    const isOnDNC = dncSet.has(normalizedPhone) || dncSet.has(normalizedPhone.slice(3));
                    const status = isOnDNC ? 'dnc-blocked' : 'queued';
                    if (isOnDNC) totalDNCBlocked++; else totalQueued++;

                    logsToInsert.push({
                        campaignId,
                        contactId: contact._id,
                        phoneNumber: normalizedPhone,
                        callerId: campaignCallerIds[callerIdIndex],
                        status,
                        twilioCallDetails: isOnDNC ? { reason: 'Blocked by DNC list' } : {},
                        createdAt: moment().tz('UTC').toDate(),
                        updatedAt: moment().tz('UTC').toDate(),
                    });

                    callerIdIndex = (callerIdIndex + 1) % campaignCallerIds.length;
                }
            }

            if (logsToInsert.length) {
                await VoiceDialerLog.insertMany(logsToInsert, { ordered: false });
            }

            skip += BATCH_SIZE;
            console.log(`[Batch] Processed: ${totalProcessed}, Queued: ${totalQueued}, DNC: ${totalDNCBlocked}, Invalid: ${totalInvalidSkipped}`);
        }

        campaign.contactsQueued = totalQueued;
        campaign.status = 'queued';
        await campaign.save();

        console.log(`[Background Job] ✅ Done for Campaign ${campaignId}. Total Queued: ${totalQueued}`);
    } catch (error) {
        console.error(`[Background Job] ❌ Error:`, error);
        await Campaign.findByIdAndUpdate(campaignId, { status: 'failed', $set: { errorDetails: error.message } });
    }
};


// Main createCampaign controller (Updated for multiple callerIds)
exports.createCampaign = async (req, res) => {
    try {
        const { name, contactGroup, callerIds, assignedAgentId, callsPerMinute } = req.body; // callerIds is an array

        // --- 1. Validate Initial Input ---
        if (!name || !contactGroup || !callerIds || !callsPerMinute) {
            return res.status(400).json({ message: 'Missing required fields: name, contactGroup, callerIds, callsPerMinute.' });
        }
        if (!Array.isArray(callerIds) || callerIds.length === 0) {
            return res.status(400).json({ message: 'At least one Caller ID must be selected and provided as an array.' });
        }
        if (callsPerMinute < 1 || callsPerMinute > 60) {
            return res.status(400).json({ message: 'Calls per minute must be between 1 and 60.' });
        }

        // --- 2. Validate Contact Group ---
        const group = await ContactGroup.findById(contactGroup);
        if (!group) {
            return res.status(400).json({ message: 'Invalid contact group.' });
        }

        // --- 3. Validate Twilio Numbers (all selected callerIds in array) ---
        const existingTwilioNumbers = await TwilioNumber.find({ phoneNumber: { $in: callerIds } });
        if (existingTwilioNumbers.length !== callerIds.length) {
            const invalidTwilioNumbers = callerIds.filter(id => !existingTwilioNumbers.some(num => num.phoneNumber === id));
            return res.status(400).json({
                message: 'One or more selected Caller IDs are not valid Twilio numbers you own.',
                invalidNumbers: invalidTwilioNumbers
            });
        }

        // --- 4. Validate Agent (if not auto-assign) ---
        if (assignedAgentId && assignedAgentId !== 'auto') {
            const agent = await Agent.findById(assignedAgentId);
            if (!agent) {
                return res.status(400).json({ message: 'Invalid assigned agent ID.' });
            }
        }

        // --- 5. Create and Save Campaign Quickly ---
        const campaign = new Campaign({
            name,
            contactGroup,
            callerIds, // Store the array of caller IDs
            assignedAgentId: assignedAgentId === 'auto' ? null : assignedAgentId,
            callsPerMinute,
            status: 'pending', // Set to 'pending' while contacts are being processed
            totalContactsInGroup: 0,
            contactsQueued: 0,
            createdAt: moment().tz('UTC').toDate(),
            updatedAt: moment().tz('UTC').toDate(),
        });

        await campaign.save();

        // --- 6. Initiate Background Processing ---
        setTimeout(() => {
            processContactsInBackground(campaign._id, contactGroup, callerIds); // Pass the array
        }, 100);

        res.status(201).json({
            message: 'Campaign creation initiated. Contacts are being queued in the background.',
            campaign: campaign,
            status: 'processing_contacts',
        });

    } catch (error) {
        console.error('Error creating campaign:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Campaign name already exists. Please choose a different name.' });
        }
        res.status(500).json({ message: 'Server error while creating campaign.', error: error.message });
    }
};
/**
exports.createCampaign = async (req, res) => {
  try {
    const { name, contactGroup,callerIds, assignedAgentId, callsPerMinute } = req.body;

    // Validate input
    if (!name || !contactGroup || !callerId || !callsPerMinute) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Validate contact group
    const group = await ContactGroup.findById(contactGroup);
    if (!group) {
      return res.status(400).json({ message: 'Invalid contact group.' });
    }

    // Validate Twilio number
    const twilioNumber = await TwilioNumber.findOne({ phoneNumber: callerId });
    if (!twilioNumber) {
      return res.status(400).json({ message: 'Invalid Twilio number.' });
    }

    // Validate agent (if not auto)
    if (assignedAgentId !== 'auto') {
      const agent = await Agent.findById(assignedAgentId);
      if (!agent) {
        return res.status(400).json({ message: 'Invalid agent.' });
      }
    }

    // Validate calls per minute
    if (callsPerMinute < 1 || callsPerMinute > 60) {
      return res.status(400).json({ message: 'Calls per minute must be between 1 and 60.' });
    }

    // Fetch contacts by groups field
    const contacts = await Contact.find({ groups: contactGroup });
    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ message: 'Contact group has no contacts.' });
    }

    // Normalize and validate phone numbers
    const dialerLogs = [];
    const invalidNumbers = [];

    for (const contact of contacts) {      
      
      const phones = [contact.phone1, contact.phone2, contact.phone3].filter(Boolean);
      const uniqueNumbers = [...new Set(phones)]; // Remove duplicates
      for (const phone of uniqueNumbers) {
        let normalizedPhone = phone;
        if (/^\d{10}$/.test(phone)) {
          normalizedPhone = `+91${phone}`; // Add +1 for US 10-digit numbers
        } else if (!/^\+[1-9]\d{1,14}$/.test(normalizedPhone)) {
          invalidNumbers.push({ contactId: contact._id, phone });
          continue;
        }

        // --- CORRECTED DNC CHECK ---
                // Prepare an array of formats to check against the DNCContact table
                const dncCheckNumbers = [normalizedPhone]; // Always include the E.164 format

                // If the normalized phone number is a +91 number, also include its 10-digit version
                // for the DNC lookup, *if* your DNC table stores numbers without country codes.
                if (normalizedPhone.startsWith('+91') && normalizedPhone.length === 13) {
                    dncCheckNumbers.push(normalizedPhone.substring(3)); // e.g., '8006258302' from '+918006258302'
                }
                // Add similar checks for other country codes if applicable (e.g., for +1 US numbers)
                // if (normalizedPhone.startsWith('+1') && normalizedPhone.length === 11) {
                //     dncCheckNumbers.push(normalizedPhone.substring(2)); // Removes '+1'
                // }

                // Perform the DNC lookup using $in to find if any of the formats exist in the DNC list
                const isDNC = await DNCContact.findOne({ phone: { $in: dncCheckNumbers } });
                if (isDNC) {
                    console.log(`Skipping DNC contact: ${normalizedPhone} (found in DNC list as: ${isDNC.phone})`);
                    continue; // Skip this number, as it's on the DNC list
                }
                // --- END CORRECTED DNC CHECK ---


        // Check for existing log to avoid duplicates
        const existingLog = await VoiceDialerLog.findOne({
          campaignId: null,
          contactId: contact._id,
          phoneNumber: normalizedPhone,
        });
        if (!existingLog) {
          dialerLogs.push({
            campaignId: null, // Set after campaign save
            contactId: contact._id,
            phoneNumber: normalizedPhone,
            callerId,
            status: 'queued',
            createdAt: moment().tz('UTC').toDate(),
            updatedAt: moment().tz('UTC').toDate(),
          });
        }
      }
    }

    if (invalidNumbers.length > 0) {
      return res.status(400).json({
        message: 'Some contacts have invalid phone numbers.',
        invalidNumbers,
      });
    }

    if (dialerLogs.length === 0) {
      return res.status(400).json({ message: 'No valid phone numbers found for contacts.' });
    }

    // Create campaign
    const campaign = new Campaign({
      name,
      contactGroup,
      callerId,
      assignedAgentId: assignedAgentId === 'auto' ? null : assignedAgentId,
      callsPerMinute,
      status: 'queued',
      contactsQueued: dialerLogs.length,
      totalContactsInGroup: contacts.length,
      createdAt: moment().tz('UTC').toDate(),
      updatedAt: moment().tz('UTC').toDate(),
    });

    await campaign.save();

    // Update dialerLogs with campaignId
    const logsToInsert = dialerLogs.map(log => ({
      ...log,
      campaignId: campaign._id,
    }));

    await VoiceDialerLog.insertMany(logsToInsert);

    res.status(201).json({
      message: 'Campaign created and contacts queued successfully!',
      campaign,
      queuedContactsCount: dialerLogs.length,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Campaign name already exists.' });
    }
    res.status(500).json({ message: 'Server error while creating campaign.', error: error.message });
  }
};
*/
/**
 * @desc Get all campaigns with progress
 * @route GET /api/dialer/campaigns
 * @access Private
 */
// exports.getCampaigns = async (req, res) => {
//   try {
//     const campaigns = await Campaign.find()
//       .populate('contactGroup', 'name')
//       .populate('assignedAgentId', 'firstName lastName')
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: 'Campaigns retrieved successfully.',
//       campaigns,
//     });
//   } catch (error) {
//     console.error('Error fetching campaigns:', error);
//     res.status(500).json({ message: 'Server error while fetching campaigns.', error: error.message });
//   }
// };

exports.getCampaigns = async (req, res) => {
  try {
    // These console logs are crucial for debugging
    console.log('GET /api/dialer/campaigns hit');
    console.log('req.user from middleware:', req.user); // Should now contain _id and role

    let query = {}; // Initialize an empty query object

    // Check if an agent is logged in and if their ID is available in req.user
    if (req.user) {
      if (req.user.role === 'agent') {
        // If an agent is logged in, only show campaigns assigned to them
        query.assignedAgentId = req.user._id;
        console.log(`Filtering campaigns for logged-in agent: ${req.user._id}`);
      } else if (req.user.role === 'admin') {
        // If an admin is logged in, show all campaigns (query remains empty)
        console.log('Admin logged in, fetching all campaigns.');
      } else {
        // This case should ideally not be hit if middleware is robust, but good for fallback
        console.log('Unknown user role in req.user, fetching all campaigns (or handle as error).');
      }
    } else {
      // This path should ideally not be hit if route is protected
      console.log('No req.user, this route should be protected.');
      return res.status(401).json({ message: 'Not authorized to view campaigns.' });
    }

    const campaigns = await Campaign.find(query) // Apply the dynamic query
      .populate('contactGroup', 'name')
      .populate('assignedAgentId', 'firstName lastName')
      .sort({ createdAt: -1 });

    console.log(`Found ${campaigns.length} campaigns for query:`, query);

    res.status(200).json({
      message: 'Campaigns retrieved successfully.',
      campaigns,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Server error while fetching campaigns.', error: error.message });
  }
};

/**
 * @desc Start/Pause a campaign
 * @route PUT /api/dialer/campaigns/:id/status
 * @access Private
 */
exports.updateCampaignStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['running', 'paused'].includes(status)) {
    return res.status(400).json({ message: 'Invalid campaign status.' });
  }

  try {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }

    if (campaign.status === 'completed' || campaign.status === 'failed') {
      return res.status(400).json({ message: `Campaign is already ${campaign.status} and cannot be modified.` });
    }

    campaign.status = status;
    await campaign.save();

    if (status === 'running') {
      startDialerWorkerForCampaign(campaign._id.toString());
      res.status(200).json({ message: `Campaign '${campaign.name}' started.`, campaign });
    } else {
      stopDialerWorkerForCampaign(campaign._id.toString());
      res.status(200).json({ message: `Campaign '${campaign.name}' paused.`, campaign });
    }
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({ message: 'Server error updating campaign status.', error: error.message });
  }
};

/**
 * @desc Delete a campaign
 * @route DELETE /api/dialer/campaigns/:id
 * @access Private
 */
exports.deleteCampaign = async (req, res) => {
  const { id } = req.params;

  try {
    const campaign = await Campaign.findByIdAndDelete(id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found.' });
    }

    stopDialerWorkerForCampaign(id);
    await VoiceDialerLog.deleteMany({ campaignId: id });
    // await CallLog.deleteMany({ campaignId: id });

    res.status(200).json({ message: 'Campaign and its logs deleted successfully.' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ message: 'Server error deleting campaign.', error: error.message });
  }
};

/**
 * @desc Handle initial outbound IVR
 * @route GET /api/dialer/outbound-ivr
 * @access Public (called by Twilio)
 */
// exports.outboundIvr = async (req, res) => {
//     const voiceResponse = new Twilio.twiml.VoiceResponse();

//     // Get data passed from your call initiation (from query params)
//     // 'customerPhoneNumber' is the customer's number (the 'To' number)
//     // 'twilioCallerId' is the Twilio number that made the call (the 'From' number)
//     const { customerPhoneNumber, twilioCallerId } = req.query;

//     let firstName = "Customer"; // Default
//     if (customerPhoneNumber) {
//         try {
//             // Use customerPhoneNumber to find the contact and fetch firstName
//             const contact = await Contact.findOne({ phoneNumber: customerPhoneNumber });
//             if (contact && contact.firstName) {
//                 firstName = contact.firstName;
//             }
//         } catch (error) {
//             console.error(`Error fetching contact (phoneNumber: ${customerPhoneNumber}) for IVR:`, error);
//         }
//     }

//     const gather = voiceResponse.gather({
//         numDigits: 1,
//         // Pass both customerPhoneNumber and twilioCallerId to the next step
//         action: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/process-outbound-ivr?customerPhoneNumber=${customerPhoneNumber}&twilioCallerId=${twilioCallerId}`,
//         method: 'POST', // Twilio sends Digits via POST
//         timeout: 10, // Seconds to wait for input
//     });

//     gather.say({ voice: 'Polly.Amy' }, `If this is ${firstName}, press 1. If not, press 2.`);

//     // If no digit is pressed, re-prompt after a timeout
//     voiceResponse.say({ voice: 'Polly.Amy' }, "We didn't receive any input. Please try again.");
//     voiceResponse.redirect({ method: 'GET' }, `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/outbound-ivr?customerPhoneNumber=${customerPhoneNumber}&twilioCallerId=${twilioCallerId}`);

//     res.type('text/xml');
//     res.send(voiceResponse.toString());
// };

// /**
//  * @desc Process digit input from outbound IVR
//  * @route POST /api/dialer/process-outbound-ivr
//  * @access Public (called by Twilio)
//  */
// exports.processOutboundIvr = async (req, res) => {
//     const voiceResponse = new Twilio.twiml.VoiceResponse();
//     const digit = req.body.Digits;
//     // Get original parameters from query
//     const { customerPhoneNumber, twilioCallerId } = req.query;
//     const callSid = req.body.CallSid; // The current Call SID from Twilio

//     // Static agent number for now
//     const staticAgentNumber = "+15673581426"; // **IMPORTANT: Replace with your actual agent's phone number**

//     // --- Dynamic Agent Number (Uncomment and implement when ready) ---
//     let agentNumberToDial = staticAgentNumber;
//     if (digit === "1") {
//         try {
//             // Attempt to find the campaign's assigned agent using the CallLog
//             const callLogEntry = await CallLog.findOne({ callSid: callSid });
//             if (callLogEntry && callLogEntry.campaignId) {
//                 const campaign = await Campaign.findById(callLogEntry.campaignId);
//                 if (campaign && campaign.assignedAgentId) {
//                     const assignedAgent = await Agent.findById(campaign.assignedAgentId);
//                     if (assignedAgent && assignedAgent.phoneNumber) {
//                         agentNumberToDial = assignedAgent.phoneNumber;
//                     } else {
//                         console.warn(`Assigned agent for campaign ${campaign.name} not found or no phone number.`);
//                     }
//                 } else {
//                     console.warn(`Campaign ${campaign?.name} has no assigned agent.`);
//                 }
//             } else {
//                 console.warn(`CallLog entry for ${callSid} or its campaignId not found for dynamic agent assignment.`);
//             }
//             // Option 2: Fallback or if 'auto' assigned agent, find any available agent (e.g., using a queue)
//             // const availableAgent = await Agent.findOne({ status: 'online', isAvailable: true });
//             // if (availableAgent && availableAgent.phoneNumber) {
//             //     agentNumberToDial = availableAgent.phoneNumber;
//             // } else {
//             //     console.warn('No available agent found for dynamic assignment, falling back to static number.');
//             // }

//         } catch (err) {
//             console.error('Error fetching dynamic agent number:', err);
//         }
//     }
//     // --- END Dynamic Agent Number ---

//     if (digit === "1") {
//         voiceResponse.say({ voice: 'Polly.Amy' }, "Connecting you now.");
//         // Use the Twilio number that made the call (passed as twilioCallerId) as the callerId for the agent leg
//         const callerIdForAgent = twilioCallerId;

//         const dial = voiceResponse.dial({ callerId: callerIdForAgent });
//         dial.number(agentNumberToDial); // Dial the agent

//         // Update CallLog and VoiceDialerLog status to 'answered' / 'connected'
//         try {
//             await CallLog.findOneAndUpdate(
//                 { callSid: callSid },
//                 { status: 'answered', agentConnected: true, agentPhoneNumber: agentNumberToDial },
//                 { new: true, upsert: false }
//             );
//             await VoiceDialerLog.findOneAndUpdate(
//                 { callSid: callSid },
//                 { status: 'answered' },
//                 { new: true, upsert: false }
//             );
//             console.log(`Call ${callSid} status updated to 'answered' after IVR selection.`);
//         } catch (error) {
//             console.error("Error updating CallLog/VoiceDialerLog status after IVR '1' selection:", error);
//         }

//     } else if (digit === "2") {
//         voiceResponse.say({ voice: 'Polly.Amy' }, "Thank you. Goodbye.");
//         voiceResponse.hangup();

//         // Update CallLog and VoiceDialerLog to mark as 'wrong_number' or similar
//         try {
//             await CallLog.findOneAndUpdate(
//                 { callSid: callSid },
//                 { status: 'failed', reason: 'customer_declined_not_me' },
//                 { new: true, upsert: false }
//             );
//             await VoiceDialerLog.findOneAndUpdate(
//                 { callSid: callSid },
//                 { status: 'failed', twilioCallDetails: { reason: 'customer_declined_not_me' } },
//                 { new: true, upsert: false }
//             );
//             console.log(`Call ${callSid} status updated to 'customer_declined_not_me'.`);
//         } catch (error) {
//             console.error("Error updating CallLog/VoiceDialerLog status after IVR '2' selection:", error);
//         }
//     } else {
//         voiceResponse.say({ voice: 'Polly.Amy' }, "Invalid input. Please try again.");
//         // Redirect back to the outbound IVR endpoint, retaining original parameters
//         voiceResponse.redirect({ method: 'GET' }, `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/outbound-ivr?customerPhoneNumber=${customerPhoneNumber}&twilioCallerId=${twilioCallerId}`);
//     }

//     res.type('text/xml');
//     res.send(voiceResponse.toString());
// };
exports.outboundIvr = async (req, res) => {
    const voiceResponse = new Twilio.twiml.VoiceResponse();

    // Get data passed from your call initiation (from query params)
    // Trim and encode these values immediately for use in URLs
    const customerPhoneNumber = encodeURIComponent((req.query.customerPhoneNumber || '').trim());
    const twilioCallerId = encodeURIComponent((req.query.twilioCallerId || '').trim());

    // Decode for internal use (e.g., database lookup, 'Say' verb)
    const decodedCustomerPhoneNumber = decodeURIComponent(customerPhoneNumber);

    const normalizePhone = (phone) => {
        return phone.replace(/\D/g, '').replace(/^1/, ''); // keep only digits, strip 1 prefix
    };

    const normalizedPhone = normalizePhone(decodedCustomerPhoneNumber); // Use the decoded, trimmed version for normalization

    let firstName = "customer"; // Default to lowercase for natural speech if not found
    let contactId = null; // Store contactId for potential SMS later
    if (normalizedPhone) {
        try {
            const contact = await Contact.findOne({
                $or: [
                    { phone1: normalizedPhone },
                    { phone2: normalizedPhone },
                    { phone3: normalizedPhone },
                ]
            });
            if (contact) {
                contactId = contact._id; // Store contact ID
                if (contact.firstName) {
                    firstName = contact.firstName;
                }
            }
        } catch (error) {
            console.error(`Error fetching contact (phoneNumber: ${normalizedPhone}) for IVR:`, error);
        }
    }

    const baseUrl = process.env.TWILIO_WEBHOOK_BASE_URL;

    const gather = voiceResponse.gather({
        numDigits: 1,
        // Use the already encoded variables for action URL
        action: `${baseUrl}/api/dialer/process-outbound-ivr?customerPhoneNumber=${customerPhoneNumber}&twilioCallerId=${twilioCallerId}&contactId=${contactId || ''}&firstName=${encodeURIComponent(firstName)}`,
        method: 'POST', // Twilio sends Digits via POST
        timeout: 15, // Seconds to wait for input
    });

    // Updated IVR prompt - use the original firstName for speech
    gather.say({ voice: 'Polly.Amy' }, `If this is ${firstName}, press 1 for SMS, or press 2 to be transferred to a live agent. Press 3 if this is not you.`);

    // If no digit is pressed, re-prompt after a timeout
    voiceResponse.say({ voice: 'Polly.Amy' }, "We didn't receive any input. Please try again.");
    // Use the already encoded variables for redirect URL
    voiceResponse.redirect({ method: 'GET' }, `${baseUrl}/api/dialer/outbound-ivr?customerPhoneNumber=${customerPhoneNumber}&twilioCallerId=${twilioCallerId}`);

    res.type('text/xml');
    res.send(voiceResponse.toString());
};

// exports.outboundIvr = async (req, res) => {
//     const voiceResponse = new Twilio.twiml.VoiceResponse();

//     // Get data passed from your call initiation (from query params)
//     const { customerPhoneNumber, twilioCallerId } = req.query;

//  const normalizePhone = (phone) => {
//   return phone.replace(/\D/g, '').replace(/^1/, ''); // keep only digits, strip 91 prefix
// };


// const normalizedPhone = normalizePhone(customerPhoneNumber);



//     let firstName = "customer"; // Default to lowercase for natural speech if not found
//     let contactId = null; // Store contactId for potential SMS later
//     if (normalizedPhone) {
//         try {
//            const contact = await Contact.findOne({
//       $or: [
//         { phone1: normalizedPhone },
//         { phone2: normalizedPhone },
//         { phone3: normalizedPhone },
//       ]
//     });
//             if (contact) {
//                contactId = contact._id; // Store contact ID
//                 if (contact.firstName) {
//                     firstName = contact.firstName;
//                 }
               
//             }
//         } catch (error) {
//             console.error(`Error fetching contact (phoneNumber: ${normalizedPhone}) for IVR:`, error);
//         }
//     }

//     const gather = voiceResponse.gather({
//         numDigits: 1,
//         // Pass all necessary info to the next step, including contactId and firstName
//         // action: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/process-outbound-ivr?customerPhoneNumber=${customerPhoneNumber}&twilioCallerId=${twilioCallerId}&contactId=${contactId || ''}&firstName=${encodeURIComponent(firstName)}`,
//         action: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/process-outbound-ivr?customerPhoneNumber=${(customerPhoneNumber || '').trim()}&twilioCallerId=${(twilioCallerId || '').trim()}&contactId=${contactId || ''}&firstName=${encodeURIComponent(firstName)}`,

//         method: 'POST', // Twilio sends Digits via POST
//         timeout: 15, // Seconds to wait for input
//     });

//     // Updated IVR prompt
//     gather.say({ voice: 'Polly.Amy' }, `If this is ${firstName}, press 1 for SMS, or press 2 to be transferred to a live agent. Press 3 if this is not you.`);

//     // If no digit is pressed, re-prompt after a timeout
//     voiceResponse.say({ voice: 'Polly.Amy' }, "We didn't receive any input. Please try again.");
//     voiceResponse.redirect({ method: 'GET' }, `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/outbound-ivr?customerPhoneNumber=${customerPhoneNumber}&twilioCallerId=${twilioCallerId}`);

//     res.type('text/xml');
//     res.send(voiceResponse.toString());
// };

/**
 * @desc Process digit input from outbound IVR
 * @route POST /api/dialer/process-outbound-ivr
 * @access Public (called by Twilio)
 */
exports.processOutboundIvr = async (req, res) => {
    const voiceResponse = new Twilio.twiml.VoiceResponse();
    const digit = req.body.Digits;
    // Get original parameters from query, including new ones
    const { customerPhoneNumber, twilioCallerId, contactId, firstName } = req.query; // Added contactId, firstName
    const callSid = req.body.CallSid; // The current Call SID from Twilio

    // Static agent number for now (fallback if dynamic fails or no agent assigned)
    const staticAgentNumber = "+15673581426"; // **IMPORTANT: Replace with your actual agent's phone number**

    let agentNumberToDial = staticAgentNumber; // Initialize with static fallback
    let callLogEntry = null;
    try {
        // Attempt to find the campaign's assigned agent using the CallLog
        const callLogEntry = await CallLog.findOne({ callSid: callSid });
        if (callLogEntry && callLogEntry.campaignId) {
            const campaign = await Campaign.findById(callLogEntry.campaignId);
            if (campaign && campaign.assignedAgentId) {
                const assignedAgent = await Agent.findById(campaign.assignedAgentId);
                if (assignedAgent && assignedAgent.phoneNumber) {
                    agentNumberToDial = assignedAgent.phoneNumber;
                } else {
                    console.warn(`Assigned agent for campaign ${campaign.name} not found or no phone number. Falling back to static agent.`);
                }
            } else {
                console.warn(`Campaign ${campaign?.name} has no assigned agent. Falling back to static agent.`);
            }
        } else {
            console.warn(`CallLog entry for ${callSid} or its campaignId not found for dynamic agent assignment. Falling back to static agent.`);
        }
    } catch (err) {
        console.error('Error fetching dynamic agent number, falling back to static:', err);
    }

    switch (digit) {
        case "1": // Press 1 for SMS
            voiceResponse.say({ voice: 'Polly.Amy' }, `Okay ${firstName}, we will send you an SMS shortly. Goodbye.`);
            voiceResponse.hangup();
             // --- START: Discord Webhook Logic ---
            if (DISCORD_WEBHOOK_URL && contactId) {
                try {
                    const contact = await Contact.findById(contactId);
                    if (contact) {
                        const discordPayload = {
                            username: "IVR Lead Bot",
                            avatar_url: "https://i.imgur.com/4M34hi2.png", // Optional: replace with your bot's avatar
                            embeds: [
                                {
                                    title: "New Lead from IVR (SMS Request)",
                                    description: `Customer ${contact.firstName || ''} ${contact.lastName || ''} pressed 1 for SMS.`,
                                    color: 5814783, // A nice green color for Discord embeds
                                    fields: [
                                        {
                                            name: "Name",
                                            value: `${contact.firstName || 'N/A'} ${contact.lastName || 'N/A'}`,
                                            inline: true,
                                        },
                                        {
                                            name: "Email",
                                            value: contact.email || 'N/A',
                                            inline: true,
                                        },
                                        {
                                            name: "Phone Number",
                                            value: customerPhoneNumber  || 'N/A',
                                            inline: true,
                                        },
                                        {
                                            name: "Campaign",
                                            value: callLogEntry?.campaignId ? `Campaign ID: ${callLogEntry.campaignId}` : 'N/A',
                                            inline: false,
                                        },
                                        {
                                            name: "Call SID",
                                            value: callSid,
                                            inline: false,
                                        },
                                    ],
                                    timestamp: new Date().toISOString(),
                                    footer: {
                                        text: "Automated IVR Notification",
                                    },
                                },
                            ],
                        };

                        await axios.post(DISCORD_WEBHOOK_URL, discordPayload);
                        console.log(`Discord webhook sent for contact ${contact.firstName} (ID: ${contactId})`);
                    } else {
                        console.warn(`Contact not found for ID: ${contactId}. Cannot send Discord webhook.`);
                    }
                } catch (discordError) {
                    console.error('Error sending Discord webhook:', discordError.message);
                    // You might want to log the full error or specific response from Discord for debugging
                    if (discordError.response) {
                        console.error('Discord Webhook Error Response Data:', discordError.response.data);
                    }
                }
            } else {
                console.warn('Discord webhook URL or contactId not available. Skipping Discord notification.');
            }
            // --- END: Discord Webhook Logic ---
            // TODO: Implement SMS sending logic here
            // You'll need to fetch the Twilio client and send an SMS.
            // Example (pseudo-code):
            try {
                const twilioClient = await getTwilioClient();
                await twilioClient.messages.create({
                    body: `Hi ${firstName}, thanks for confirming! Here is some information about our service.`, // Customize your SMS content
                    to: customerPhoneNumber,
                    from: twilioCallerId,
                });
                console.log(`SMS sent to ${customerPhoneNumber} for CallSid: ${callSid}`);
                 await CallLog.findOneAndUpdate(
                    { callSid: callSid },
                    { status: 'completed', reason: 'sms_sent_after_ivr' },
                    { new: true, upsert: false }
                );
                await VoiceDialerLog.findOneAndUpdate(
                    { callSid: callSid },
                    { status: 'completed', twilioCallDetails: { reason: 'sms_sent_after_ivr' } },
                    { new: true, upsert: false }
                );
            } catch (smsError) {
                console.error(`Error sending SMS to ${customerPhoneNumber}:`, smsError);
                 await CallLog.findOneAndUpdate(
                    { callSid: callSid },
                    { status: 'failed', reason: 'sms_send_failed_after_ivr' },
                    { new: true, upsert: false }
                );
                await VoiceDialerLog.findOneAndUpdate(
                    { callSid: callSid },
                    { status: 'failed', twilioCallDetails: { reason: 'sms_send_failed_after_ivr', error: smsError.message } },
                    { new: true, upsert: false }
                );
            }
            break;

        case "2": // Press 2 to be transferred to a live agent
            voiceResponse.say({ voice: 'Polly.Amy' }, "Connecting you to a live agent now.");
            const dial = voiceResponse.dial({ callerId: twilioCallerId }); // Use the Twilio number that made the call
            dial.number(agentNumberToDial); // Dial the determined agent number

            // Update CallLog and VoiceDialerLog status to 'answered' / 'connected'
            try {
                await CallLog.findOneAndUpdate(
                    { callSid: callSid },
                    { status: 'answered', agentConnected: true, agentPhoneNumber: agentNumberToDial },
                    { new: true, upsert: false }
                );
                await VoiceDialerLog.findOneAndUpdate(
                    { callSid: callSid },
                    { status: 'answered' },
                    { new: true, upsert: false }
                );
                console.log(`Call ${callSid} status updated to 'answered' after IVR selection (transfer to agent).`);
            } catch (error) {
                console.error("Error updating CallLog/VoiceDialerLog status after IVR '2' selection:", error);
            }
            break;

        case "3": // Press 3 if it is not you (cut the call)
            voiceResponse.say({ voice: 'Polly.Amy' }, "Thank you. Goodbye.");
            voiceResponse.hangup();

            // Update CallLog and VoiceDialerLog to mark as 'wrong_number' or similar
            try {
                await CallLog.findOneAndUpdate(
                    { callSid: callSid },
                    { status: 'failed', reason: 'customer_declined_not_me' },
                    { new: true, upsert: false }
                );
                await VoiceDialerLog.findOneAndUpdate(
                    { callSid: callSid },
                    { status: 'failed', twilioCallDetails: { reason: 'customer_declined_not_me' } },
                    { new: true, upsert: false }
                );
                console.log(`Call ${callSid} status updated to 'customer_declined_not_me'.`);
            } catch (error) {
                console.error("Error updating CallLog/VoiceDialerLog status after IVR '3' selection:", error);
            }
            break;

        default: // Invalid input
            voiceResponse.say({ voice: 'Polly.Amy' }, "Invalid input. Please try again.");
            // Redirect back to the outbound IVR endpoint, retaining original parameters
            voiceResponse.redirect({ method: 'GET' }, `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/outbound-ivr?customerPhoneNumber=${customerPhoneNumber}&twilioCallerId=${twilioCallerId}&contactId=${contactId || ''}&firstName=${encodeURIComponent(firstName)}`);
            break;
    }

    res.type('text/xml');
    res.send(voiceResponse.toString());
};
/**
 * @desc Twilio status callback for call updates
 * @route POST /api/dialer/twilio-status-callback
 * @access Public (Twilio needs access)
 */
exports.twilioStatusCallback = async (req, res) => {
    // const { CallSid, CallStatus, CallDuration, To, From } = req.body;
     const {
 CallSid,
 CallStatus,
 CallDuration,
 To,
 From,
        RecordingUrl, // Add this
        RecordingDuration, // Add this
        SipTrunkingCallSid, // Add this (useful for detailed cost later)
        AccountSid, // Add this
 } = req.body;

    console.log(`Twilio Status Callback: CallSid=${CallSid}, CallStatus=${CallStatus}, Duration=${CallDuration}, To=${To}, From=${From}`);
     if (RecordingUrl) {
        console.log(`Recording URL: ${RecordingUrl}, Recording Duration: ${RecordingDuration}`);
    }

    try {
        const logEntry = await VoiceDialerLog.findOne({ callSid: CallSid });
        const callLog = await CallLog.findOne({ callSid: CallSid });

        if (!logEntry && !callLog) {
            console.warn(`No VoiceDialerLog or CallLog entry found for CallSid: ${CallSid}. This might be an unexpected callback.`);
            return res.status(200).send();
        }

        let newStatus = CallStatus; // Default to Twilio's status
        let updateVoiceDialerLog = {};
        let updateCallLog = { status: newStatus };
        // Populate common fields for CallLog
        updateCallLog.to = To;
        updateCallLog.from = From;
        updateCallLog.callType = 'outbound'; // For now, assume all calls via this controller are outbound

 if (CallDuration) {
const duration = parseInt(CallDuration, 10);
 updateVoiceDialerLog.callDuration = duration;
 updateCallLog.callDuration = duration;
 }

        if (RecordingUrl) {
            updateCallLog.callRecordingUrl = RecordingUrl;
        }

        // Fetch Call Cost (requires Twilio REST API call after call completion)
        // This is an advanced feature. Twilio provides 'Price' and 'PriceUnit' in the 'completed' webhook for the main call SID.
        // If you need per-leg cost or other details, you might need a separate lookup.
        if (CallStatus === 'completed' && CallSid) {
            try {
                const twilioClient = await getTwilioClient();
                const callDetails = await twilioClient.calls(CallSid).fetch();
                if (callDetails.price) {
                    updateCallLog.callCost = parseFloat(callDetails.price);
                }
                // Twilio's 'Direction' parameter indicates 'outbound-api' for calls initiated via the API
                // For agent-connected calls, it might also show 'outbound-dial' for the child call leg.
                // For simplicity, we are setting it as 'outbound' initially in processCampaignCalls and confirming here.
                if (callDetails.direction) {
                     // If Twilio reports 'inbound' for some reason, update it.
                    if (callDetails.direction.includes('inbound')) {
                        updateCallLog.callType = 'inbound';
                    } else if (callDetails.direction.includes('outbound')) {
                         updateCallLog.callType = 'outbound';
                    }
                }
            } catch (costError) {
                console.error(`Error fetching call cost/details for CallSid ${CallSid}:`, costError.message);
            }
        }

        // Flag to control if contactsCompleted should be incremented
        let incrementContactsCompleted = false;

        // Handle specific status changes for VoiceDialerLog
        switch (CallStatus) {
            case 'answered':
                updateVoiceDialerLog = { status: 'answered' };
                // Increment contactsAnswered on campaign for first answer
                if (logEntry && logEntry.status !== 'answered') {
                   await Campaign.findByIdAndUpdate(logEntry.campaignId, { $inc: { contactsAnswered: 1 } });
                }
                break;
            case 'completed':
                if (logEntry?.status === 'answered' || callLog?.status === 'answered') {
                    updateVoiceDialerLog = { status: 'completed' };
                } else {
                    updateVoiceDialerLog = { status: 'no-answer' }; // Or 'completed_no_answer'
                    updateCallLog.status = 'no-answer';
                }
                incrementContactsCompleted = true; // Mark for completion increment
                break;
            case 'failed':
            case 'no-answer':
            case 'busy':
            case 'canceled':
                updateVoiceDialerLog = { status: CallStatus };
                incrementContactsCompleted = true; // Mark for completion increment
                break;
            default:
                // For 'initiated', 'ringing', etc., just update status
                updateVoiceDialerLog = { status: CallStatus };
                break;
        }

        // if (CallDuration) {
        //     const duration = parseInt(CallDuration, 10);
        //     updateVoiceDialerLog.callDuration = duration;
        //     updateCallLog.callDuration = duration;
        // }
        updateVoiceDialerLog.twilioCallDetails = req.body;
        updateCallLog.twilioCallDetails = req.body;

        // Apply updates
        if (logEntry) {
            Object.assign(logEntry, updateVoiceDialerLog);
            await logEntry.save();
        }
        if (callLog) {
            Object.assign(callLog, updateCallLog);
            await callLog.save();
        }

        // Increment contactsCompleted only if the flag is set and not already counted
        // This check prevents double-counting if multiple callbacks lead to 'completed' or 'failed'
        if (incrementContactsCompleted && logEntry &&
            logEntry.status !== 'completed' && logEntry.status !== 'failed' &&
            logEntry.status !== 'no-answer' && logEntry.status !== 'busy' &&
            logEntry.status !== 'canceled')
        {
            await Campaign.findByIdAndUpdate(logEntry.campaignId, { $inc: { contactsCompleted: 1 } });
        }


        // Check if campaign is complete (only if a logEntry was found and had a campaignId)
        if (logEntry && logEntry.campaignId) {
            const campaign = await Campaign.findById(logEntry.campaignId);
            if (campaign && campaign.status === 'running') {
                const remainingQueued = await VoiceDialerLog.countDocuments({ campaignId: campaign._id, status: 'queued' });
                const activeDialing = await VoiceDialerLog.countDocuments({ campaignId: campaign._id, status: 'dialing' });
                if (remainingQueued === 0 && activeDialing === 0) {
                   await Campaign.findOneAndUpdate(
    { _id: campaign._id, status: 'running' },
    { $set: { status: 'completed' } }
);

                    stopDialerWorkerForCampaign(campaign._id.toString());
                    console.log(`Campaign ${campaign.name} completed.`);
                }
            }
        }

        res.status(200).send('<Response/>');
    } catch (error) {
        console.error(`Error processing Twilio status callback for CallSid ${CallSid}:`, error);
        res.status(500).send('<Response/>');
    }
};

/**
 * @desc Start workers for running campaigns on server boot
 */
exports.startActiveCampaignWorkersOnBoot = async () => {
  try {
    const runningCampaigns = await Campaign.find({ status: 'running' });
    console.log(`Found ${runningCampaigns.length} running campaigns to restart.`);
    for (const campaign of runningCampaigns) {
      startDialerWorkerForCampaign(campaign._id.toString());
    }
  } catch (error) {
    console.error('Error starting active campaign workers on boot:', error);
  }
};

// Worker to process campaign calls
const startDialerWorkerForCampaign = async (campaignId) => {
  if (activeCampaignWorkers.has(campaignId)) {
    clearInterval(activeCampaignWorkers.get(campaignId));
    activeCampaignWorkers.delete(campaignId);
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status !== 'running') {
    console.log(`Campaign ${campaignId} is not running or does not exist.`);
    return;
  }

  const intervalMs = Math.max(1000, 60000 / campaign.callsPerMinute); // Ensure at least 1-second intervals
  console.log(`Starting worker for campaign ${campaign.name} (${campaignId}) at ${campaign.callsPerMinute} CPM`);

  const intervalId = setInterval(async () => {
    try {
      await processCampaignCalls(campaignId);
    } catch (error) {
      console.error(`Error in worker for campaign ${campaignId}:`, error);
    }
  }, intervalMs);

  activeCampaignWorkers.set(campaignId, intervalId);
};

const stopDialerWorkerForCampaign = (campaignId) => {
  if (activeCampaignWorkers.has(campaignId)) {
    clearInterval(activeCampaignWorkers.get(campaignId));
    activeCampaignWorkers.delete(campaignId);
    console.log(`Stopped worker for campaign ${campaignId}`);
  }
};

const processCampaignCalls = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId).populate('contactGroup');
  if (!campaign || campaign.status !== 'running') {
    stopDialerWorkerForCampaign(campaignId);
    return;
  }

  const queuedLogEntry = await VoiceDialerLog.findOne({ campaignId: campaign._id, status: 'queued' }).populate('contactId');
  if (!queuedLogEntry) {
    const activeDialing = await VoiceDialerLog.countDocuments({ campaignId: campaign._id, status: 'dialing' });
    if (activeDialing === 0) {
      campaign.status = 'completed';
      await campaign.save();
      stopDialerWorkerForCampaign(campaignId);
      console.log(`Campaign ${campaign.name} completed.`);
    }
    return;
  }

  const contact = queuedLogEntry.contactId;
  if (!contact) {
    queuedLogEntry.status = 'failed';
    queuedLogEntry.twilioCallDetails = { error: 'Contact not found' };
    await queuedLogEntry.save();
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { contactsCalled: 1, contactsCompleted: 1 } });
    return;
  }

  // Log call attempt
  const callLog = new CallLog({
    campaignId: campaign._id,
    contactId: contact._id,
    phoneNumber: queuedLogEntry.phoneNumber,
    agentId: campaign.assignedAgentId || queuedLogEntry.agentId,
    status: 'initiated',
    to: queuedLogEntry.phoneNumber, // Customer's number
    from: queuedLogEntry.callerId,       // Your Twilio number
    callType: 'outbound',          // This is an outbound call
  });
  try {
        await callLog.save();
    } catch (saveError) {
        console.error('Error saving initial CallLog:', saveError);
        queuedLogEntry.status = 'failed';
        queuedLogEntry.twilioCallDetails = { error: `CallLog save failed: ${saveError.message}` };
        await queuedLogEntry.save();
          // Ensure to/from/callType are set even on initial save error
 callLog.to = queuedLogEntry.phoneNumber;
 callLog.from = queuedLogEntry.callerId;
 callLog.callType = 'outbound';
 await callLog.save(); // Save the updated CallLog with error status and details
        await Campaign.findByIdAndUpdate(campaignId, { $inc: { contactsCalled: 1, contactsCompleted: 1 } });
        return;
    }

  // Compliance checks
  const complianceSettings = await ComplianceSettings.getGlobalSettings();
  const complianceResult = await runAllComplianceChecks(contact, campaign, complianceSettings, queuedLogEntry.phoneNumber);
  if (!complianceResult.passed) {
    queuedLogEntry.status = complianceResult.reason.includes('DNC') ? 'dnc-blocked' : 'compliance-blocked';
    queuedLogEntry.twilioCallDetails = { reason: complianceResult.reason,  complianceType: complianceResult.type };
    await queuedLogEntry.save();
   // Update CallLog status to reflect compliance blocking
        callLog.status = queuedLogEntry.status; // e.g., 'dnc-blocked' or 'compliance-blocked'
        callLog.twilioCallDetails = queuedLogEntry.twilioCallDetails; // Copy details
          // Also update to/from/callType if they weren't set on initial save (they are now)
 callLog.to = queuedLogEntry.phoneNumber;
 callLog.from =  queuedLogEntry.callerId;
 callLog.callType = 'outbound';
        await callLog.save(); 
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { contactsCalled: 1, contactsCompleted: 1 } });
    return;
  }

  

  // Make Twilio call
  let twilioClient;
  try {
    twilioClient = await getTwilioClient();
  } catch (error) {
    queuedLogEntry.status = 'failed';
    queuedLogEntry.twilioCallDetails = { error: `Twilio client error: ${error.message}` };
    await queuedLogEntry.save();
    callLog.status = 'failed';
    // Ensure to/from/callType are set even on Twilio client error
 callLog.to = queuedLogEntry.phoneNumber;
 callLog.from =  queuedLogEntry.callerId;
 callLog.callType = 'outbound';
    await callLog.save();
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { contactsCalled: 1, contactsCompleted: 1 } });
    return;
  }

  try {
    queuedLogEntry.status = 'dialing';
    queuedLogEntry.lastAttemptAt = Date.now();
    queuedLogEntry.attemptCount = (queuedLogEntry.attemptCount || 0) + 1;
    await queuedLogEntry.save();

    const call = await twilioClient.calls.create({
      to: queuedLogEntry.phoneNumber,
      from: queuedLogEntry.callerId,
      // url: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/twilio-webhook`,
       // Pass the customer's phoneNumber and the Twilio number making the call to the IVR endpoint
            url: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/outbound-ivr?customerPhoneNumber=${queuedLogEntry.phoneNumber}&twilioCallerId=${campaign.callerId}`,
            method: 'GET', // 👈 This is the missing piece!
      statusCallback: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/dialer/twilio-status-callback`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
       record: true, // Uncomment this if you want to record all calls initiated by the dialer
      statusCallbackMethod: 'POST',
    });

    if (call.recordingSid) {
  callLog.callRecordingSid = call.recordingSid;
}

    queuedLogEntry.callSid = call.sid;
    await queuedLogEntry.save();
    callLog.callSid = call.sid;
    callLog.status = 'dialing';
    await callLog.save();

    await Campaign.findByIdAndUpdate(campaignId, { $inc: { contactsCalled: 1 } });
  } catch (error) {
    console.error(`Error making call to ${queuedLogEntry.phoneNumber}:`, error);
    queuedLogEntry.status = 'failed';
    queuedLogEntry.twilioCallDetails = { error: error.message };
    await queuedLogEntry.save();
    callLog.status = 'failed';
     // Ensure to/from/callType are set even on Twilio call creation error
 callLog.to = queuedLogEntry.phoneNumber;
 callLog.from = queuedLogEntry.callerId;
 callLog.callType = 'outbound';
    await callLog.save();
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { contactsCalled: 1, contactsCompleted: 1 } });
  }
};

/**
 * @desc Get VoiceDialerLog entries for a specific campaign
 * @route GET /api/dialer/campaigns/:campaignId/logs
 * @access Private
 */
exports.getVoiceDialerLogsForCampaign = async (req, res) => {
    const { campaignId } = req.params;
    const { page = 1, pageSize = 10, searchQuery = '' } = req.query;

    const limit = parseInt(pageSize, 10);
    const skip = (parseInt(page, 10) - 1) * limit;

    try {
        // Validate campaignId
        if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ message: 'Invalid campaign ID.' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found.' });
        }

        let matchQuery = { campaignId: new mongoose.Types.ObjectId(campaignId) }; // Use ObjectId for matching

        // Implement search logic
        if (searchQuery) {
            const searchRegex = new RegExp(searchQuery, 'i');
            // For searching on populated fields, you'd typically need to add a $lookup earlier
            // and then include those fields in the $or. For now, sticking to VoiceDialerLog fields.
            matchQuery.$or = [
                { phoneNumber: searchRegex },
                { status: searchRegex },
                { 'twilioCallDetails.error': searchRegex },
                { 'twilioCallDetails.reason': searchRegex },
            ];
        }

        const aggregationPipeline = [
            { $match: matchQuery }, // Apply initial filters
            {
                $addFields: {
                    // Assign a custom sort order: 0 for non-queued, 1 for queued
                    customSortOrder: {
                        $cond: {
                            if: { $eq: ["$status", "queued"] },
                            then: 1, // 'queued' comes last
                            else: 0   // Other statuses come first
                        }
                    }
                }
            },
            { $sort: { customSortOrder: 1, createdAt: -1 } }, // Sort by custom order, then by creation date descending
            {
                $facet: {
                    metadata: [{ $count: "totalEntries" }],
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        // Populate contactId using $lookup
                        {
                            $lookup: {
                                from: 'contacts', // The actual collection name for the Contact model
                                localField: 'contactId',
                                foreignField: '_id',
                                as: 'contactInfo' // Temporary field name for the joined contact data
                            }
                        },
                        {
                            $unwind: {
                                path: '$contactInfo',
                                preserveNullAndEmptyArrays: true // Keep logs even if contact is not found
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                campaignId: 1,
                                phoneNumber: 1,
                                callerId: 1,
                                status: 1,
                                callSid: 1,
                                twilioCallDetails: 1,
                                  attemptCount: 1, // Add attemptCount here
                                createdAt: 1,
                                updatedAt: 1,
                                // Reshape contactInfo to match the original 'populate' output for 'contactId'
                                'contactId': {
                                    _id: '$contactInfo._id',
                                    firstName: '$contactInfo.firstName',
                                    lastName: '$contactInfo.lastName',
                                    email: '$contactInfo.email',
                                    phone1: '$contactInfo.phone1',
                                    phone2: '$contactInfo.phone2',
                                    phone3: '$contactInfo.phone3',
                                },
                                // Removed: customSortOrder: 0, as it's an inclusion projection
                                // Fields not listed here will be implicitly excluded.
                            }
                        }
                    ]
                }
            }
        ];

        const result = await VoiceDialerLog.aggregate(aggregationPipeline);

        const logs = result[0].data;
        const totalEntries = result[0].metadata.length > 0 ? result[0].metadata[0].totalEntries : 0;
        const totalPages = Math.ceil(totalEntries / limit);

        res.status(200).json({
            message: `Voice Dialer Logs for Campaign ${campaign.name} retrieved successfully.`,
            voiceDialerLogs: logs,
            totalEntries,
            totalPages,
            currentPage: parseInt(page, 10),
            pageSize: limit,
        });

    } catch (error) {
        console.error(`Error fetching VoiceDialerLogs for campaign ${campaignId}:`, error);
        res.status(500).json({ message: 'Server error while fetching voice dialer logs.', error: error.message });
    }
};
// exports.getVoiceDialerLogsForCampaign = async (req, res) => {
//     const { campaignId } = req.params;
//     const { page = 1, pageSize = 10, searchQuery = '' } = req.query;

//     const limit = parseInt(pageSize, 10);
//     const skip = (parseInt(page, 10) - 1) * limit;

//     try {
//         // Validate campaignId
//         if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId)) {
//             return res.status(400).json({ message: 'Invalid campaign ID.' });
//         }

//         const campaign = await Campaign.findById(campaignId);
//         if (!campaign) {
//             return res.status(404).json({ message: 'Campaign not found.' });
//         }

//         let query = { campaignId: campaignId };

//         // Implement search logic (similar to your CallLog search)
//         if (searchQuery) {
//             const searchRegex = new RegExp(searchQuery, 'i');
//             query.$or = [
//                 { phoneNumber: searchRegex },
//                 { status: searchRegex },
//                 { 'twilioCallDetails.error': searchRegex },
//                 { 'twilioCallDetails.reason': searchRegex },
//                 // You can add more fields from Contact if populated, e.g.:
//                 // { 'contactId.firstName': searchRegex },
//                 // { 'contactId.lastName': searchRegex },
//                 // { 'contactId.email': searchRegex },
//             ];
//         }

//         // Fetch logs with pagination, sorted by latest first
//         const voiceDialerLogs = await VoiceDialerLog.find(query)
//             .populate('contactId', 'firstName lastName email phone1 phone2 phone3') // Populate contact details
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(limit);

//         const totalEntries = await VoiceDialerLog.countDocuments(query);
//         const totalPages = Math.ceil(totalEntries / limit);

//         res.status(200).json({
//             message: `Voice Dialer Logs for Campaign ${campaign.name} retrieved successfully.`,
//             voiceDialerLogs,
//             totalEntries,
//             totalPages,
//             currentPage: parseInt(page, 10),
//             pageSize: limit,
//         });

//     } catch (error) {
//         console.error(`Error fetching VoiceDialerLogs for campaign ${campaignId}:`, error);
//         res.status(500).json({ message: 'Server error while fetching voice dialer logs.', error: error.message });
//     }
// };

