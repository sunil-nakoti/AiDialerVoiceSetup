const express = require('express');
const { getAgents, createAgent, updateAgent, deleteAgent, loginAgent, updateAgentPassword  } = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware


const router = express.Router();

// Apply authentication middleware if you have user authentication
// router.route('/').get(protect, getAgents).post(protect, createAgent);
// router.route('/:id').put(protect, updateAgent).delete(protect, deleteAgent);

// Without authentication (for demonstration):
// router.route('/').get(getAgents).post(createAgent);
// router.route('/:id').put(updateAgent).delete(deleteAgent);
// router.post('/login', loginAgent);

// Public route for agent login
router.post('/login', loginAgent);

// Protected routes for agents (assuming only admin or authenticated agents can manage agents)
router.route('/')
  .get(protect, getAgents)   // e.g., only admin can get all agents
  .post(protect, createAgent); // e.g., only admin can create new agents

router.route('/:id')
  .put(protect, updateAgent)
  .delete(protect, deleteAgent);

  // --- NEW: Route for Agent Password Change ---
// This route should be protected and ideally restricted to 'agent' role
router.post('/change-password', protect, updateAgentPassword);
// If you have a restrictTo middleware:
// router.post('/change-password', protect, restrictTo('agent'), updateAgentPassword);
// --- END NEW ---

module.exports = router;