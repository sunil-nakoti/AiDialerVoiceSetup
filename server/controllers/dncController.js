const DNCContact = require('../models/DNCContact');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');

exports.getContacts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', startDate, endDate } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate && endDate) {
      query.dateAdded = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const contacts = await DNCContact.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const totalContacts = await DNCContact.countDocuments(query);

    res.status(200).json({
      success: true,
      data: contacts,
      totalContacts,
      currentPage: Number(page),
      totalPages: Math.ceil(totalContacts / limit),
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createContact = async (req, res) => {
  try {
    const contact = await DNCContact.create(req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const contact = await DNCContact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const contact = await DNCContact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.importContacts = async (req, res) => {
  try {
    console.log('Received import request:', req.file);
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = path.resolve(req.file.path);
    console.log('Processing file:', filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ success: false, error: `File not found: ${filePath}` });
    }

    const contacts = [];
    const errors = [];

    const parser = parse({ delimiter: ',', trim: true, skip_empty_lines: true });

    parser.on('readable', function () {
      let record;
      let rowIndex = 0;
      while ((record = parser.read()) !== null) {
        rowIndex++;
        if (rowIndex === 1 && record[0].toLowerCase().includes('name')) {
          continue; // Skip header row
        }
        const [name, phone, email, reason] = record;
        if (name && phone) {
          contacts.push({
            name,
            phone,
            email: email || '',
            reason: reason || 'CSV Import',
            dateAdded: new Date(),
          });
        } else {
          errors.push(`Invalid record at row ${rowIndex}: Missing name or phone`);
        }
      }
    });

    parser.on('error', function (err) {
      errors.push(`CSV parsing error: ${err.message}`);
    });

    parser.on('end', async () => {
      try {
        fs.unlinkSync(filePath);
        console.log(`File deleted: ${filePath}`);
      } catch (unlinkError) {
        console.error(`Failed to delete file ${filePath}:`, unlinkError.message);
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      try {
        const insertedContacts = await DNCContact.insertMany(contacts, { ordered: false });
        res.status(201).json({ success: true, data: insertedContacts, totalImported: insertedContacts.length });
      } catch (error) {
        console.error('Error inserting contacts:', error);
        res.status(400).json({ success: false, error: `Failed to insert contacts: ${error.message}` });
      }
    });

    fs.createReadStream(filePath).pipe(parser);
  } catch (error) {
    console.error('Error in importContacts:', error);
    res.status(500).json({ success: false, error: `Server error: ${error.message}` });
  }
};

exports.exportContacts = async (req, res) => {
  try {
    const contacts = await DNCContact.find().lean();
    const csvContent = [
      ['Name', 'Phone', 'Email', 'Date Added', 'Reason'],
      ...contacts.map(contact => [
        `"${contact.name.replace(/"/g, '""')}"`,
        contact.phone,
        contact.email ? `"${contact.email.replace(/"/g, '""')}"` : '',
        contact.dateAdded.toISOString().split('T')[0],
        contact.reason ? `"${contact.reason.replace(/"/g, '""')}"` : '',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=dnc-list.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting contacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};