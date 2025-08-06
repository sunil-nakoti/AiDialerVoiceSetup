import { useState, useEffect, useCallback } from "react";
import { Clock, Phone, Users, XCircle } from "lucide-react";
import apiClient from "../../../utils/apiClient";
import { toast } from "react-toastify";
import "@/css/AutoDialer.css";
import { useNavigate } from "react-router-dom";

// Assume you have a way to get the current user's role and ID.
const getCurrentUser = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user || { role: 'agent', _id: 'sampleAgentId123', firstName: 'Logged', lastName: 'Agent' };
};

export default function AutoDialer() {
  const [callsPerMinute, setCallsPerMinute] = useState(30);
  const [campaigns, setCampaigns] = useState([]);
  const [contactGroups, setContactGroups] = useState([]);
  const [allTwilioNumbers, setAllTwilioNumbers] = useState([]); // Store all fetched Twilio numbers
  const [selectedCallerIds, setSelectedCallerIds] = useState([]); // Array for selected caller IDs
  const [agents, setAgents] = useState([]);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    contactGroup: "",
    callerIds: [], // This is now an array
    assignedAgentId: "auto",
    callsPerMinute: 30,
  });
  const [stats, setStats] = useState({
    activeCalls: 0,
    connectedAgents: 0,
    avgCallDuration: "0:00",
    failedCalls: 0,
    activeCampaigns: 0,
    totalCallsToday: 0,
    successRate: "0.0%",
    callsPerMinute: 0,
    complianceScore: 100,
  });
  const [loading, setLoading] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const navigate = useNavigate();

  const currentUser = getCurrentUser();
  const isAdmin = currentUser.role === 'admin';
  const currentAgentId = currentUser._id;

  // --- Fetch Data Functions ---
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/dialer/campaigns`);
      setCampaigns(response.data.campaigns || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      toast.error("Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContactGroups = useCallback(async () => {
    try {
      const response = await apiClient.get(`/api/contacts/groups`);
      const groups = response.data.groups || response.data || [];
      setContactGroups(Array.isArray(groups) ? groups : []);
      if (!groups.length) {
        toast.warn("No contact groups found.");
      }
    } catch (err) {
      console.error("Error fetching contact groups:", err);
      setContactGroups([]);
      toast.error("Failed to load contact groups.");
    }
  }, []);

  const fetchTwilioNumbers = useCallback(async () => {
    try {
      const response = await apiClient.get(`/api/twilio/purchased`);
      const numbers = response.data.numbers || response.data || [];
      setAllTwilioNumbers(Array.isArray(numbers) ? numbers : []);
      if (!numbers.length) {
        toast.warn("No Twilio numbers found.");
      }
    } catch (err) {
      console.error("Error fetching Twilio numbers:", err);
      setAllTwilioNumbers([]);
      toast.error("Failed to load Twilio numbers.");
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      let url = `/api/agents`;
      if (!isAdmin && currentAgentId) {
        url = `/api/agents?agentId=${currentAgentId}`;
      }
      const response = await apiClient.get(url);
      const fetchedAgents = response.data.agents || response.data || [];

      let agentsToDisplay = [];
      if (isAdmin) {
        agentsToDisplay = fetchedAgents;
      } else if (currentAgentId) {
        agentsToDisplay = fetchedAgents.filter(agent => agent._id === currentAgentId);
        if (agentsToDisplay.length > 0) {
            setNewCampaign(prev => ({ ...prev, assignedAgentId: agentsToDisplay[0]._id }));
        }
      }
      setAgents(Array.isArray(agentsToDisplay) ? agentsToDisplay : []);

      if (!agentsToDisplay.length) {
        toast.warn(isAdmin ? "No agents found." : "No agent profile found for your user.");
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
      setAgents([]);
      toast.error("Failed to load agents.");
    }
  }, [isAdmin, currentAgentId]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get(`/api/compliance/metrics`);
      setStats((prev) => ({
        ...prev,
        ...response.data,
        complianceScore:
          response.data.complianceScore !== undefined
            ? response.data.complianceScore
            : 100,
        activeCalls: response.data.activeCalls || 0,
        connectedAgents: response.data.connectedAgents || 0,
        avgCallDuration: response.data.avgCallDuration || "0:00",
        failedCalls: response.data.failedCalls || 0,
        activeCampaigns: response.data.activeCampaigns || 0,
        totalCallsToday: response.data.totalCallsToday || 0,
        successRate: response.data.successRate || "0.0%",
        callsPerMinute: response.data.callsPerMinute || 0,
      }));
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchContactGroups();
    fetchTwilioNumbers();
    if (currentUser._id) {
        fetchAgents();
    }
    fetchStats();

    const pollInterval = setInterval(() => {
      fetchCampaigns();
      fetchStats();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [
    fetchCampaigns,
    fetchContactGroups,
    fetchTwilioNumbers,
    fetchAgents,
    fetchStats,
    currentUser._id
  ]);

  // --- Form Handlers ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCampaign((prev) => ({ ...prev, [name]: value }));
  };

  // Handler for Caller ID selection - adds to array
  const handleCallerIdAdd = (e) => {
    const newPhoneNumber = e.target.value;
    if (newPhoneNumber && !selectedCallerIds.includes(newPhoneNumber)) {
      const updatedCallerIds = [...selectedCallerIds, newPhoneNumber];
      setSelectedCallerIds(updatedCallerIds);
      setNewCampaign((prev) => ({ ...prev, callerIds: updatedCallerIds }));
      e.target.value = ""; // Reset dropdown after selection
    }
  };

  const handleRemoveSelectedCallerId = (numberToRemove) => {
    const updatedCallerIds = selectedCallerIds.filter(
      (number) => number !== numberToRemove
    );
    setSelectedCallerIds(updatedCallerIds);
    setNewCampaign((prev) => ({ ...prev, callerIds: updatedCallerIds }));
  };


  const handleCallsPerMinuteChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setCallsPerMinute(value);
    setNewCampaign((prev) => ({ ...prev, callsPerMinute: value }));
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setIsCreatingCampaign(true);
    try {
      // Ensure at least one callerId is selected
      if (newCampaign.callerIds.length === 0) {
        toast.error("Please select at least one Caller ID.");
        setIsCreatingCampaign(false);
        return;
      }

      const response = await apiClient.post(
        `/api/dialer/campaigns`,
        newCampaign
      );
      setCampaigns((prev) => [...prev, response.data.campaign]);
      setNewCampaign({
        name: "",
        contactGroup: "",
        callerIds: [], // Reset callerIds array
        assignedAgentId: isAdmin ? "auto" : currentAgentId,
        callsPerMinute: 30,
      });
      setSelectedCallerIds([]); // Reset selected caller IDs in UI
      setCallsPerMinute(30);
      toast.success(response.data.message || "Campaign created successfully!");
    } catch (err) {
      console.error(
        "Error creating campaign:",
        err.response?.data || err.message
      );
      toast.error(err.response?.data?.message || "Failed to create campaign.");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // --- Campaign Action Handlers (kept same as before) ---
  const handleToggleCampaignStatus = async (campaignId, currentStatus) => {
    const newStatus = currentStatus === "running" ? "paused" : "running";
    setLoading(true);
    try {
      const response = await apiClient.put(
        `/api/dialer/campaigns/${campaignId}/status`,
        { status: newStatus }
      );
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign._id === campaignId
            ? { ...campaign, status: newStatus }
            : campaign
        )
      );
      toast.success(
        `Campaign ${response.data.campaign.name} ${
          newStatus === "running" ? "started" : "paused"
        }.`
      );
    } catch (err) {
      console.error(
        `Error toggling campaign status:`,
        err.response?.data || err.message
      );
      toast.error(
        err.response?.data?.message || `Failed to ${newStatus} campaign.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm("Are you sure you want to delete this campaign?")) {
      setLoading(true);
      try {
        await apiClient.delete(`/api/dialer/campaigns/${campaignId}`);
        setCampaigns((prev) =>
          prev.filter((campaign) => campaign._id !== campaignId)
        );
        toast.success("Campaign deleted successfully.");
      } catch (err) {
        console.error(
          `Error deleting campaign:`,
          err.response?.data || err.message
        );
        toast.error(
          err.response?.data?.message || "Failed to delete campaign."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter available Twilio numbers: exclude those already selected
  const availableTwilioNumbers = allTwilioNumbers.filter(
    (number) => !selectedCallerIds.includes(number.phoneNumber)
  );

  return (
    <div className="auto-dialer-container">
      {/* Breadcrumb and Stats Grid - unchanged */}
      <div className="breadcrumb">
        <a href="/" className="home-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </a>
        <span>/</span>
        <a href="/dashboard">Dashboard</a>
        <span>/</span>
      </div>

      <div className="page-header">
        <h4>Auto Dialer</h4>
        <p className="subtitle">
          Configure and manage your automated calling campaigns
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Active Calls</div>
            <div className="stat-icon phone5">
              <Phone size={16} />
            </div>
          </div>
          <div className="stat-value">{stats.activeCalls}</div>
          <div className="stat-change positive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <span>+12% vs last hour</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Connected Agents</div>
            <div className="stat-icon agents5">
              <Users size={16} />
            </div>
          </div>
          <div className="stat-value">{stats.connectedAgents}</div>
          <div className="stat-change positive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>92% online</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Avg. Call Duration</div>
            <div className="stat-icon duration5">
              <Clock size={16} />
            </div>
          </div>
          <div className="stat-value">{stats.avgCallDuration}</div>
          <div className="stat-change positive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <span>+5% vs yesterday</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Failed Calls</div>
            <div className="stat-icon failed5">
              <XCircle size={16} />
            </div>
          </div>
          <div className="stat-value">{stats.failedCalls}</div>
          <div className="stat-change negative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>2% failure rate</span>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="panel-content">
            <h2>New Campaign</h2>

            <div className="form-group">
              <label>Campaign Title</label>
              <input
                type="text"
                name="name"
                value={newCampaign.name}
                onChange={handleInputChange}
                placeholder="Enter campaign title"
              />
            </div>

            {/* UPDATED CALLER ID SELECTION UI FOR MULTIPLE */}
            <div className="form-group">
              <label>Caller IDs</label>
              <div className="selected-caller-ids-container">
                {selectedCallerIds.map((number) => (
                  <div key={number} className="selected-caller-id-tag">
                    {number}
                    <button type="button" onClick={() => handleRemoveSelectedCallerId(number)}>
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <div className="select-wrapper">
                <select
                  name="callerIdSelect" // This name is just for the select element itself
                  value="" // Always empty so selecting re-triggers onChange
                  onChange={handleCallerIdAdd}
                >
                  <option value="">Select phone numbers to add</option>
                  {availableTwilioNumbers.map((number) => (
                    <option key={number._id} value={number.phoneNumber}>
                      {number.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* END UPDATED CALLER ID SELECTION UI */}

            <div className="form-group">
              <label>Contact Group</label>
              <div className="select-wrapper">
                <select
                  name="contactGroup"
                  value={newCampaign.contactGroup}
                  onChange={handleInputChange}
                >
                  <option value="">Select a group</option>
                  {contactGroups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Assign Agent (Optional)</label>
              <div className="select-wrapper">
                <select
                  name="assignedAgentId"
                  value={newCampaign.assignedAgentId}
                  onChange={handleInputChange}
                  disabled={!isAdmin && agents.length === 1 && agents[0]._id === currentAgentId}
                >
                  {isAdmin && <option value="auto">Auto-assign to available agents</option>}
                  {agents.map((agent) => (
                    <option key={agent._id} value={agent._id}>
                      {agent.firstName} {agent.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Calls per Minute: {callsPerMinute}</label>
              <input
                type="range"
                min="1"
                max="60"
                value={callsPerMinute}
                onChange={handleCallsPerMinuteChange}
                className="range-slider"
              />
            </div>

            <button
              className="start-campaign-btn"
              onClick={handleCreateCampaign}
              disabled={isCreatingCampaign || loading}
            >
              {isCreatingCampaign ? (
                <>
                  <span className="spinner"></span> Processing...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Create Campaign
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel and Table Section - unchanged */}
        <div className="right-panel">
          <div className="panel-content">
            <h2>Campaign Statistics</h2>

            <div className="stat-grid">
              <div className="stat-box light-blue">
                <div className="stat-title">Active Campaigns</div>
                <div className="stat-number">{stats.activeCampaigns}</div>
              </div>

              <div className="stat-box light-green">
                <div className="stat-title">Total Calls Today</div>
                <div className="stat-number">{stats.totalCallsToday}</div>
              </div>

              <div className="stat-box light-purple">
                <div className="stat-title">Success Rate</div>
                <div className="stat-number">{stats.successRate}</div>
              </div>

              <div className="stat-box light-orange">
                <div className="stat-title">Calls/Min</div>
                <div className="stat-number">{stats.callsPerMinute}</div>
              </div>
            </div>

            <div className="compliance-section">
              <div className="compliance-header">
                <h3>Compliance Score</h3>
                <div className="compliance-info">TCPA & FDCPA Compliance</div>
              </div>

              <div className="compliance-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${stats.complianceScore}%` }}
                  ></div>
                </div>
                <div className="compliance-value">
                  {stats.complianceScore.toFixed(1)}%
                </div>
              </div>

              <div className="compliance-message">
                {stats.complianceScore >= 90
                  ? "Excellent"
                  : stats.complianceScore >= 70
                  ? "Good"
                  : "Needs Improvement"}{" "}
                compliance score
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-section">
        <div className="table-container">
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Start/Stop</th>
                <th>Date and Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign._id}>
                  <td>{campaign.name}</td>
                  <td>
                    <span
                      className={`status-badge ${campaign.status.toLowerCase()}`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`control-btn ${
                        campaign.status === "running" ? "running" : "stopped"
                      }`}
                      onClick={() =>
                        handleToggleCampaignStatus(
                          campaign._id,
                          campaign.status
                        )
                      }
                      disabled={
                        loading ||
                        campaign.status === "completed" ||
                        campaign.status === "failed" ||
                        campaign.status === "pending"
                      }
                    >
                      {campaign.status === "running" ? "Running" : campaign.status === "pending" ? "Processing..." : "Stopped"}
                    </button>
                  </td>
                  <td>{new Date(campaign.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="action-buttons">
                      {(campaign.status === "queued" ||
                        campaign.status === "paused" ||
                        campaign.status === "pending") && (
                        <button
                          className="action-btn next"
                          onClick={() =>
                            handleToggleCampaignStatus(
                              campaign._id,
                              campaign.status
                            )
                          }
                          disabled={loading || campaign.status === "pending"}
                        >
                          Start Campaign
                        </button>
                      )}
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteCampaign(campaign._id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                      <button
                        className="action-btn report"
                        onClick={() =>
                          navigate(`/dialer/campaigns/${campaign._id}/report`)
                        }
                      >
                        Report
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}