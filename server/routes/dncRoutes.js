const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path'); // Add path module for directory check
const fs = require('fs');     // Add fs module for directory check

const {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  exportContacts,
} = require('../controllers/dncController');

// --- BEGIN CHANGES FOR MULTER CONFIGURATION ---

// Ensure the 'uploads' directory exists
// This is important because multer needs the directory to be there.
const uploadDir = path.join(__dirname, '../../uploads'); // Adjust path based on your project structure if 'uploads' is in the root
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Use the dynamically checked uploadDir
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Define all accepted MIME types for CSV files
    const acceptedCsvMimeTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel', // This is the key one you were seeing
      'text/comma-separated-values',
      'application/x-csv',
      'text/x-csv',
      'text/plain' // Some systems might send simple CSVs as plain text
    ];

    if (acceptedCsvMimeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      // Provide a more specific error message if desired
      cb(new Error('Invalid file type. Only CSV files are allowed.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// --- END CHANGES FOR MULTER CONFIGURATION ---

router.get('/', getContacts);
router.post('/', createContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);
router.post('/import', upload.single('file'), importContacts); // No change here, it's correct
router.get('/export', exportContacts);

module.exports = router;