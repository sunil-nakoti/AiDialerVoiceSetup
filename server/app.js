const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron'); // Import node-cron
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;

// Create uploads directory for voicemails (use lowercase to avoid case issues on Linux)
const uploadsDir = path.join(__dirname, 'uploads/voicemails');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
// Configure CORS. Allow localhost during development and any additional domains via ALLOWED_ORIGINS.
const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for voicemail uploads
app.use('/uploads/voicemails', express.static(uploadsDir));

// MongoDB Connection (Mongoose 8: deprecated options removed)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Load routes
console.log('Loading routes...');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contactRoutes');
const settingRoutes = require('./routes/settingRoutes');
const agentRoutes = require('./routes/agentRoutes');
const twilioRoutes = require('./routes/twilioRoutes');
const complianceRoutes = require('./routes/compliance');
const dncRoutes = require('./routes/dncRoutes');
const dialerRoutes = require('./routes/dialerRoutes');
const { cleanOldCallLogs } = require('./utils/cleanupService'); // Import cleanup function
const dashboardRoutes = require('./routes/dashboardRoutes');
const callLogRoutes = require('./routes/callLogRoutes'); // Your new route file
const userRoutes = require('./routes/userRoutes');

// Apply API routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/dnc', dncRoutes);
app.use('/api/dialer', dialerRoutes);
app.use('/api/dashboard', dashboardRoutes);
// Mount your call log routes
app.use('/api', callLogRoutes);

// Mount User Profile Routes
app.use('/api/users', userRoutes);

// Schedule the CallLog cleanup task
// This will run once every day at 2 AM UTC (0 2 * * *)
// You can adjust the cron schedule as needed:
// '0 0 * * *'  -> Midnight UTC
// '0 0 * * 0'  -> Midnight UTC every Sunday
cron.schedule('0 2 * * *', () => {
    console.log('Running scheduled CallLog cleanup...');
    cleanOldCallLogs(30); // Clean up logs older than 30 days
});
console.log('All routes applied successfully');

// Health check endpoint (always available)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve React frontend in production only if explicitly enabled and present
if (process.env.NODE_ENV === 'production') {
  const clientBuildDir = path.join(__dirname, 'client', 'build');
  const indexHtmlPath = path.join(clientBuildDir, 'index.html');
  const serveClient = process.env.SERVE_CLIENT === 'true' && fs.existsSync(indexHtmlPath);

  if (serveClient) {
    app.use(express.static(clientBuildDir));
    // Serve index.html for non-API GET requests
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(indexHtmlPath);
      }
      next();
    });
  } else {
    const frontendUrl = process.env.FRONTEND_URL;
    // Provide a simple root handler to avoid ENOENT errors when no client build exists
    app.get('/', (req, res) => {
      if (frontendUrl) {
        return res.redirect(frontendUrl);
      }
      res.status(200).json({
        status: 'ok',
        message: 'API server running. No client build served. Set SERVE_CLIENT=true and include client/build to serve static frontend.',
      });
    });
  }
}

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR HANDLER:', err.stack);
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`JWT_SECRET check: ${process.env.JWT_SECRET ? 'Loaded' : 'NOT LOADED - CHECK .env'}`);
  console.log(`MONGO_URI check: ${process.env.MONGO_URI ? 'Loaded' : 'NOT LOADED - CHECK .env'}`);
  
  try {
    const { startActiveCampaignWorkersOnBoot } = require('./controllers/dialerController');
    await startActiveCampaignWorkersOnBoot();
    console.log('✅ Active campaign workers started');
  } catch (error) {
    console.error('❌ Error starting campaign workers:', error);
  }
});

module.exports = app;
