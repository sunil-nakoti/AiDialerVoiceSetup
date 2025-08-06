// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Require fs to ensure 'uploads' directory exists

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Use the defined uploadDir
  },
  filename: (req, file, cb) => {
    // Create a unique filename to prevent conflicts
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accepted MIME types for CSV files
    const acceptedCsvMimeTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel', // Microsoft Excel CSV
      'text/comma-separated-values',
      'application/x-csv',
      'text/x-csv',
      'text/plain' // Sometimes CSVs might be reported as plain text
    ];

    if (acceptedCsvMimeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      // Create a custom error to make it clear what went wrong
      const error = new Error('Invalid file type. Only CSV files are allowed.');
      error.status = 400; // Set a status code for the error
      cb(error, false); // Reject the file with an error
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file size limit
  }
});

module.exports = upload;