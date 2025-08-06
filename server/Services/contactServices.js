

const Contact = require('../models/Contact');
const ContactGroup = require('../models/ContactGroup');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Parse CSV data from a buffer
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Promise<{columns: string[], data: Object[]}>} - Parsed columns and data
 */
exports.parseCSVBuffer = async (buffer) => {
  const results = [];
  const columns = new Set();
  
  // Create a stream from the buffer
  const stream = Readable.from(buffer);
  
  // Process the CSV file
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
  
  return {
    columns: Array.from(columns),
    data: results
  };
};

/**
 * Create a new contact
 * @param {Object} contactData - Contact data
 * @returns {Promise<Object>} - Created contact
 */
exports.createContact = async (contactData) => {
  const contact = new Contact(contactData);
  await contact.save();
  return contact;
};

/**
 * Create a new contact group
 * @param {string} name - Group name
 * @param {string} description - Group description
 * @returns {Promise<Object>} - Created group
 */
exports.createContactGroup = async (name, description = '') => {
  const group = new ContactGroup({
    name,
    description
  });
  await group.save();
  return group;
};

/**
 * Add contacts to a group
 * @param {string} groupId - Group ID
 * @param {string[]} contactIds - Array of contact IDs
 * @returns {Promise<Object>} - Updated group
 */
exports.addContactsToGroup = async (groupId, contactIds) => {
  // Get the group
  const group = await ContactGroup.findById(groupId);
  if (!group) {
    throw new Error('Contact group not found');
  }
  
  // Add contacts to group
  group.contacts = [...new Set([...group.contacts, ...contactIds])];
  await group.save();
  
  // Update contacts with group reference
  await Contact.updateMany(
    { _id: { $in: contactIds } },
    { $addToSet: { groups: groupId } }
  );
  
  return group;
};

/**
 * Get all contact groups
 * @returns {Promise<Object[]>} - Array of groups
 */
exports.getAllGroups = async () => {
  return await ContactGroup.find().select('name description');
};

/**
 * Get contacts by group
 * @param {string} groupId - Group ID
 * @returns {Promise<Object[]>} - Array of contacts
 */
exports.getContactsByGroup = async (groupId) => {
  return await Contact.find({ groups: groupId });
};

/**
 * Search contacts
 * @param {Object} params - Search parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Results per page
 * @param {string} params.search - Search term
 * @returns {Promise<{contacts: Object[], totalPages: number, currentPage: number, totalContacts: number}>} - Search results
 */
exports.searchContacts = async ({ page = 1, limit = 10, search = '' }) => {
  const query = {};
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { mailingAddress: { $regex: search, $options: 'i' } },
      { propertyAddress: { $regex: search, $options: 'i' } }
    ];
  }
  
  const contacts = await Contact.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });
    
  const count = await Contact.countDocuments(query);
  
  return {
    contacts,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    totalContacts: count
  };
};