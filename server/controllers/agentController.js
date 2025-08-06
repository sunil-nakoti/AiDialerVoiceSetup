const Agent = require('../models/Agent');
const bcrypt = require('bcryptjs'); // Import bcrypt for password comparison
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for token generation
const LoginLog = require('../models/LoginLog'); // <--- IMPORT LoginLog


// Helper function to generate JWT
// Will now include the role
const generateToken = (id) => {
  return jwt.sign({ id, role: 'agent' }, process.env.JWT_SECRET, { // <--- ADDED role: 'agent'
    expiresIn: '1d',
  });
};


// @desc    Authenticate agent & get token
// @route   POST /api/agents/login (new route for login)
// @access  Public
exports.loginAgent = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter both email and password.' });
  }

  try {
    // Find agent by email and explicitly select the password
    const agent = await Agent.findOne({ email }).select('+password');

    if (!agent) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare provided password with hashed password in DB
    const isMatch = await bcrypt.compare(password, agent.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
  const agentRole = 'agent'; // Explicitly define role for logged-in agent user
    const token = generateToken(agent._id, agentRole);

    // Convert Mongoose document to plain object and add role
    const agentForResponse = agent.toObject();
    delete agentForResponse.password;
    agentForResponse.role = agentRole; // Add the role property to the response object

    // --- NEW: Log the successful login event ---
    await LoginLog.create({
        userId: agent._id,
        role: agentRole,
        ipAddress: req.ip, // Capture IP address
        userAgent: req.headers['user-agent'], // Capture user agent string
        status: 'success',
        details: 'Agent successful login',
    });
    // --- END NEW ---

    // Password matches, generate token and send agent data
    res.status(200).json({
     // Spread the modified agent object and add the token
      ...agentForResponse,
      token: token,
    });
  } catch (error) {
    console.error('Error in loginAgent:', error);
    res.status(500).json({ message: 'Server error during agent login.', error: error.message });
  }
};


// @desc    Get all agents
// @route   GET /api/agents
// @access  Private (e.g., admin or authenticated user)
exports.getAgents = async (req, res) => {
  try {
    const agents = await Agent.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Agents retrieved successfully.',
      agents: agents,
    });
  } catch (error) {
    console.error(`Error in getAgents: ${error.message}`);
    res.status(500).json({ message: 'Server error while fetching agents.', error: error.message });
  }
};

// @desc    Create a new agent
// @route   POST /api/agents
// @access  Private
exports.createAgent = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Basic validation
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Validation failed', errors: ['First name, last name, email, and password are required.'] });
  }

  try {
    const agent = await Agent.create({ firstName, lastName, email, password });
    const agentResponse = agent.toObject();
    delete agentResponse.password; // Remove password from response
    res.status(201).json({
      message: 'Agent created successfully!',
      agent: agentResponse,
    });
  } catch (error) {
    console.error(`Error in createAgent: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Validation Error', errors: ['An agent with this email already exists.'] });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation Error', errors: errors });
    }
    res.status(500).json({ message: 'Server error while creating agent.', error: error.message });
  }
};

// @desc    Update an agent
// @route   PUT /api/agents/:id
// @access  Private
// exports.updateAgent = async (req, res) => {
//   const { id } = req.params;
//   const { firstName, lastName, email, password } = req.body;

//   // Basic validation
//   if (!firstName || !lastName || !email) {
//     return res.status(400).json({ message: 'Validation failed', errors: ['First name, last name, and email are required.'] });
//   }

//   try {
//     const updateData = { firstName, lastName, email, updatedAt: Date.now() };
//     if (password) {
//       updateData.password = password; // Will be hashed by pre-save hook
//     }

//     const agent = await Agent.findByIdAndUpdate(
//       id,
//       updateData,
//       { new: true, runValidators: true }
//     ).select('-password');

//     if (!agent) {
//       return res.status(404).json({ message: 'Agent not found.' });
//     }

//     res.status(200).json({
//       message: 'Agent updated successfully!',
//       agent: agent,
//     });
//   } catch (error) {
//     console.error(`Error in updateAgent: ${error.message}`);
//     if (error.code === 11000) {
//       return res.status(400).json({ message: 'Validation Error', errors: ['An agent with this email already exists.'] });
//     }
//     if (error.name === 'ValidationError') {
//       const errors = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({ message: 'Validation Error', errors: errors });
//     }
//     res.status(500).json({ message: 'Server error while updating agent.', error: error.message });
//   }
// };
exports.updateAgent = async (req, res) => {
  const { id } = req.params;
  // --- START CHANGES HERE ---
  // Destructure all possible fields from req.body, including the new ones
  const {
    firstName,
    lastName,
    email,
    password, // Keep password here for potential update
    phone,
    dob,
    addressLine1,
    addressLine2,
    state,
    country,
    language,
    dateFormat
  } = req.body;

  try {
    // Construct updateData object using all provided fields
    const updateData = {
      firstName,
      lastName,
      email,
      phone,
      dob,
      addressLine1,
      addressLine2,
      state,
      country,
      language,
      dateFormat,
      updatedAt: Date.now()
    };

    // If a password is provided, add it to updateData (pre-save hook will hash it)
    if (password) {
      updateData.password = password;
    }

    // Remove any undefined fields from updateData so Mongoose doesn't set them to null/undefined
    // unless explicitly intended (e.g., setting dob to null)
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const agent = await Agent.findByIdAndUpdate(
      id,
      updateData, // Pass the dynamically constructed updateData
      { new: true, runValidators: true }
    ).select('-password');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    res.status(200).json({
      message: 'Agent updated successfully!',
      agent: agent,
    });
  } catch (error) {
    console.error(`Error in updateAgent: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Validation Error', errors: ['An agent with this email already exists.'] });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: 'Validation Error', errors: errors });
    }
    res.status(500).json({ message: 'Server error while updating agent.', error: error.message });
  }
};

// @desc    Delete an agent
// @route   DELETE /api/agents/:id
// @access  Private
exports.deleteAgent = async (req, res) => {
  const { id } = req.params;

  try {
    const agent = await Agent.findByIdAndDelete(id);

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    res.status(200).json({ message: 'Agent deleted successfully!' });
  } catch (error) {
    console.error(`Error in deleteAgent: ${error.message}`);
    res.status(500).json({ message: 'Server error while deleting agent.', error: error.message });
  }
};


// --- NEW: Agent Password Update Function ---
exports.updateAgentPassword = async (req, res) => {
    try {
        // FIX: Use req.user._id instead of req.user.id as populated by Mongoose object
const agentId = req.user._id; // Assuming auth middleware populates req.user.id
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ message: 'Please provide current password, new password, and confirm new password.' });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: 'New password and confirm new password do not match.' });
        }

        const agent = await Agent.findById(agentId).select('+password');

        if (!agent) {
            return res.status(404).json({ message: 'Agent not found.' });
        }

        // Verify current password using bcrypt
        const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, agent.password);
        if (!isCurrentPasswordCorrect) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        // Update password (pre-save hook in Agent model should hash it)
        agent.password = newPassword;
        await agent.save();

        // Optionally, re-issue a new token if you want to invalidate old sessions
        const newToken = generateToken(agent._id, 'agent');

        res.status(200).json({
            status: 'success',
            message: 'Password updated successfully.',
            token: newToken // Send new token if re-issued
        });

    } catch (error) {
        console.error("UPDATE AGENT PASSWORD ERROR:", error);
        res.status(500).json({ message: 'Failed to update password. Please try again later.', error: error.message });
    }
};