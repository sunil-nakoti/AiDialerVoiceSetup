const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (256 bits)
const IV_LENGTH = 16; // For AES, this is always 16 bytes

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) { // 32 bytes = 64 hex chars
  console.error('Error: ENCRYPTION_KEY is not defined or not 32 bytes long (64 hex characters) in .env file.');
  process.exit(1); // Exit if key is missing or incorrect
}

// Convert hex string key to Buffer
const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

const encrypt = (text) => {
  if (text === null || text === undefined) {
    return null;
  }
  const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV for each encryption
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // Store IV with encrypted data
};

const decrypt = (text) => {
  if (!text) {
    return null;
  }
  const parts = text.split(':');
  if (parts.length !== 2) {
    console.warn('Invalid encrypted text format for decryption.');
    return null; // Handle malformed encrypted strings gracefully
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = {
  encrypt,
  decrypt,
};