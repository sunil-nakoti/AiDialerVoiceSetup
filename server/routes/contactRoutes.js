const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const multer = require('multer');

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// CSV parsing route
router.post('/parse-csv', upload.single('file'), contactController.parseCSV);

// Contact import route
router.post('/import', upload.single('file'), contactController.importContacts);

// Get all contact groups
router.get('/groups', contactController.getContactGroups);

// Get contacts by group
router.get('/groups/:groupId', contactController.getContactsByGroup);

// Get all contacts with pagination and search
router.get('/', contactController.getAllContacts);

// Delete a contact
router.delete('/:contactId', contactController.deleteContact);

// Delete a group
router.delete('/groups/:groupId', contactController.deleteGroup);

// Create a new group
router.post('/groups', contactController.createGroup);
router.get('/dashboard-stats', contactController.getDashboardStats);

module.exports = router;