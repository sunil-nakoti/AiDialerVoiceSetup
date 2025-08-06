const Contact = require('../models/Contact');
const ContactGroup = require('../models/ContactGroup');
const DNCContact = require('../models/DNCContact');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Helper function for phone number validation and normalization
const normalizePhoneNumber = (phoneNumberString) => {
    if (!phoneNumberString) return null;

    const digitsOnly = phoneNumberString.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
        return digitsOnly;
    }
    return null;
};

exports.parseCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = [];
        const columns = new Set();

        const stream = Readable.from(req.file.buffer);

        await new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('headers', (headers) => {
                    headers.forEach(header => columns.add(header));
                })
                .on('data', (data) => {
                    results.push(data);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        return res.status(200).json({
            columns: Array.from(columns),
            data: results
        });
    } catch (error) {
        console.error('Error parsing CSV:', error);
        return res.status(500).json({ message: 'Failed to parse CSV file', error: error.message });
    }
};

exports.importContacts = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const importConfig = JSON.parse(req.body.importConfig);
        const { mappings, groupInfo } = importConfig;

        let contactGroup;
        if (groupInfo.option === 'create' && groupInfo.newGroupName) {
            contactGroup = new ContactGroup({
                name: groupInfo.newGroupName,
                description: groupInfo.groupDescription || '',
                contacts: []
            });
            await contactGroup.save();
        } else if (groupInfo.option === 'existing' && groupInfo.existingGroupId) {
            contactGroup = await ContactGroup.findById(groupInfo.existingGroupId);
            if (!contactGroup) {
                return res.status(404).json({ message: 'Contact group not found' });
            }
        }

        const stream = Readable.from(req.file.buffer);

        const results = [];
        const failedRecords = [];
        const contactIds = [];

        await new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', async (data) => {
                    try {
                        const contactData = {};
                        let recordFailed = false;
                        let failReason = '';

                        Object.keys(data).forEach(column => {
                            const mappedField = mappings[column];
                            if (mappedField && mappedField !== '') {
                                if (['phone1', 'phone2', 'phone3'].includes(mappedField)) {
                                    const originalPhoneValue = data[column];
                                    const normalizedPhone = normalizePhoneNumber(originalPhoneValue);

                                    if (mappedField === 'phone1') {
                                        if (originalPhoneValue && !normalizedPhone) {
                                            recordFailed = true;
                                            failReason = `Invalid phone1 format or not 10 digits: "${originalPhoneValue}"`;
                                        } else {
                                            contactData[mappedField] = normalizedPhone;
                                        }
                                    } else {
                                        if (originalPhoneValue && !normalizedPhone) {
                                            console.warn(`Skipping invalid phone number for field ${mappedField}: "${originalPhoneValue}" in record:`, data);
                                            contactData[mappedField] = null;
                                        } else {
                                            contactData[mappedField] = normalizedPhone;
                                        }
                                    }
                                } else {
                                    contactData[mappedField] = data[column];
                                }
                            }
                        });

                        contactData.isDNC = false;

                        if (!contactData.firstName) {
                            recordFailed = true;
                            failReason = 'Missing required field: firstName';
                        }

                        if (recordFailed) {
                            failedRecords.push({
                                data: data,
                                reason: failReason
                            });
                            return;
                        }

                        if (contactGroup) {
                            contactData.groups = [contactGroup._id];
                        } else {
                            contactData.groups = [];
                        }

                        const contact = new Contact(contactData);

                        await contact.save();
                        contactIds.push(contact._id);
                        results.push(contact);
                    } catch (error) {
                        console.error('Error processing contact record during import:', data, error);
                        failedRecords.push({
                            data: data,
                            reason: error.message
                        });
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (contactGroup && contactIds.length > 0) {
            contactGroup.contacts = [...contactGroup.contacts, ...contactIds];
            await contactGroup.save();
        }

        return res.status(200).json({
            message: 'Import completed',
            total: results.length + failedRecords.length,
            imported: results.length,
            failed: failedRecords.length,
            failedRecords: failedRecords.length > 0 ? failedRecords : null
        });
    } catch (error) {
        console.error('Error importing contacts:', error);
        return res.status(500).json({ message: 'Failed to import contacts', error: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const dncContacts = await DNCContact.find().select('phoneNumber');
        const dncPhoneNumbers = dncContacts.map(dnc => dnc.phoneNumber).filter(phone => phone);

        const [totalContacts, totalGroups, contactsWithEmail, contactsWithPhone, dncListCount] = await Promise.all([
            Contact.countDocuments(),
            ContactGroup.countDocuments(),
            Contact.countDocuments({ mailingAddress: { $exists: true, $ne: null, $ne: '', $regex: '@' } }),
            Contact.countDocuments({
                $or: [
                    { phone1: { $exists: true, $ne: null, $ne: '' } },
                    { phone2: { $exists: true, $ne: null, $ne: '' } },
                    { phone3: { $exists: true, $ne: null, $ne: '' } },
                ]
            }),
            Contact.countDocuments({
                $or: [
                    { phone1: { $in: dncPhoneNumbers } },
                    { phone2: { $in: dncPhoneNumbers } },
                    { phone3: { $in: dncPhoneNumbers } },
                ]
            }),
        ]);

        const avgContactsPerGroup = totalGroups > 0 ? Math.round(totalContacts / totalGroups) : 0;

        return res.status(200).json({
            totalContacts,
            totalGroups,
            dncList: dncListCount,
            contactsWithEmail,
            contactsWithPhone,
            avgContactsPerGroup,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
};

exports.getContactGroups = async (req, res) => {
    try {
        const groups = await ContactGroup.aggregate([
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    contactCount: { $size: "$contacts" }
                }
            }
        ]);
        return res.status(200).json(groups);
    } catch (error) {
        console.error('Error fetching contact groups:', error);
        return res.status(500).json({ message: 'Failed to fetch contact groups', error: error.message });
    }
};

exports.getContactsByGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const limitInt = parseInt(limit);
        const pageInt = parseInt(page);
        const skip = (pageInt - 1) * limitInt;

        const totalContacts = await Contact.countDocuments({ groups: groupId });
        const contacts = await Contact.find({ groups: groupId })
            .skip(skip)
            .limit(limitInt)
            .select('firstName lastName mailingAddress mailingCity mailingState mailingZip propertyAddress propertyCity propertyState propertyZip phone1 phone2 phone3 isDNC timeZone createdAt updatedAt');

        const totalPages = Math.ceil(totalContacts / limitInt);

        return res.status(200).json({
            contacts,
            totalPages,
            currentPage: pageInt,
            totalContacts
        });
    } catch (error) {
        console.error('Error fetching contacts by group:', error);
        return res.status(500).json({ message: 'Failed to fetch contacts', error: error.message });
    }
};

exports.getAllContacts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { mailingAddress: { $regex: search, $options: 'i' } },
                { propertyAddress: { $regex: search, $options: 'i' } },
                { mailingCity: { $regex: search, $options: 'i' } },
                { mailingState: { $regex: search, $options: 'i' } },
                { mailingZip: { $regex: search, $options: 'i' } },
                { propertyCity: { $regex: search, $options: 'i' } },
                { propertyState: { $regex: search, $options: 'i' } },
                { propertyZip: { $regex: search, $options: 'i' } },
            ];
        }

        const contacts = await Contact.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .select('firstName lastName mailingAddress mailingCity mailingState mailingZip propertyAddress propertyCity propertyState propertyZip phone1 phone2 phone3 isDNC timeZone createdAt updatedAt');

        const count = await Contact.countDocuments(query);

        return res.status(200).json({
            contacts,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalContacts: count
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        return res.status(500).json({ message: 'Failed to fetch contacts', error: error.message });
    }
};

exports.deleteContact = async (req, res) => {
    try {
        const { contactId } = req.params;
        const contact = await Contact.findByIdAndDelete(contactId);
        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        await ContactGroup.updateMany(
            { contacts: contactId },
            { $pull: { contacts: contactId } }
        );
        return res.status(200).json({ message: 'Contact deleted successfully', contactId });
    } catch (error) {
        console.error('Error deleting contact:', error);
        return res.status(500).json({ message: 'Failed to delete contact', error: error.message });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await ContactGroup.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        // Delete all contacts associated with the group
        await Contact.deleteMany({ groups: groupId });
        // Delete the group itself
        await ContactGroup.findByIdAndDelete(groupId);
        return res.status(200).json({ message: 'Group and associated contacts deleted successfully', groupId });
    } catch (error) {
        console.error('Error deleting group:', error);
        return res.status(500).json({ message: 'Failed to delete group', error: error.message });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Group name is required' });
        }
        const contactGroup = new ContactGroup({
            name,
            description: description || '',
            contacts: []
        });
        await contactGroup.save();
        return res.status(201).json({ message: 'Group created successfully', group: contactGroup });
    } catch (error) {
        console.error('Error creating group:', error);
        return res.status(500).json({ message: 'Failed to create group', error: error.message });
    }
};