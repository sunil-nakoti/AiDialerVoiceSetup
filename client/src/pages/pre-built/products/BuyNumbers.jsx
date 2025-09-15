import { useState, useEffect } from 'react';
// import { Check, X, Phone, RefreshCw, Search, Plus, Trash2, Edit, XCircle, Forward } from 'lucide-react';
import { Check, X, Phone, RefreshCw, Search, Plus, Trash2, Edit, XCircle, Forward, Download } from 'lucide-react';
import AgentModal from './AgentModal';
// import axios from 'axios';
import apiClient from "../../../utils/apiClient";
import Swal from 'sweetalert2'; // Import SweetAlert2
export default function BuyNumbers() {
  // const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [areaCode, setAreaCode] = useState('');
  const [numberType, setNumberType] = useState('local');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumbersToBuy, setSelectedNumbersToBuy] = useState([]);
  const [purchasedNumbers, setPurchasedNumbers] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
   const [isLoadingExport, setIsLoadingExport] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [message, setMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [forwardToNumber, setForwardToNumber] = useState('');
  const [enableRecording, setEnableRecording] = useState(false);
  const [timeout, setTimeout] = useState(10);
  const [voicemailFile, setVoicemailFile] = useState(null);
  const [voicemailFileName, setVoicemailFileName] = useState('No file selected.');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, purchasedNumbersRes] = await Promise.all([
          apiClient.get(`/api/agents`),
          apiClient.get(`/api/twilio/purchased`),
        ]);

        setAgents(agentsRes.data.agents || []);
        setPurchasedNumbers(purchasedNumbersRes.data.numbers || []);
        setMessage({ type: 'success', text: 'Data loaded successfully.' });
      } catch (error) {
        console.error('Error fetching initial data:', error);
        const errorMessage = error.response?.data?.message || 'Failed to load initial data.';
        setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'audio/mpeg') {
        setMessage({ type: 'error', text: 'Please upload a valid MP3 file.' });
        setVoicemailFile(null);
        setVoicemailFileName('No file selected.');
      } else if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB.' });
        setVoicemailFile(null);
        setVoicemailFileName('No file selected.');
      } else {
        setVoicemailFile(file);
        setVoicemailFileName(file.name);
      }
    }
  };

  const handleOpenForwardModal = (number) => {
    setSelectedNumber(number);
    setForwardToNumber(number.forwardTo || '');
    setEnableRecording(number.enableRecording || false);
    setTimeout(number.timeout || 10);
    setVoicemailFile(null);
    setVoicemailFileName(number.voicemailUrl ? 'Current voicemail file set' : 'No file selected.');
    setShowForwardModal(true);
  };

  const handleSyncFromTwilio = async () => {
    setMessage(null);
    setIsSyncing(true);
    try {
      await apiClient.post(`/api/twilio/sync`);
      const purchasedNumbersRes = await apiClient.get(`/api/twilio/purchased`);
      setPurchasedNumbers(purchasedNumbersRes.data.numbers || []);
      setMessage({ type: 'success', text: 'Synced numbers from Twilio.' });
    } catch (error) {
      console.error('Error syncing numbers:', error);
      const errorMessage = error.response?.data?.message || 'Failed to sync numbers.';
      setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloseForwardModal = () => {
    setShowForwardModal(false);
    setSelectedNumber(null);
    setForwardToNumber('');
    setEnableRecording(false);
    setTimeout(10);
    setVoicemailFile(null);
    setVoicemailFileName('No file selected.');
  };

  const handleSaveForwarding = async () => {
    if (!selectedNumber) return;

    try {
      const formData = new FormData();
      formData.append('forwardTo', forwardToNumber);
      formData.append('enableRecording', enableRecording);
      formData.append('timeout', timeout);
      if (voicemailFile) {
        formData.append('voicemailFile', voicemailFile);
      }

      const response = await apiClient.put(`/api/twilio/${selectedNumber._id}/forward`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPurchasedNumbers((prev) =>
        prev.map((num) =>
          num._id === selectedNumber._id
            ? {
                ...num,
                forwardTo: forwardToNumber,
                enableRecording,
                timeout,
                voicemailUrl: response.data.phoneNumber.voicemailUrl || num.voicemailUrl,
              }
            : num
        )
      );
      setMessage({ type: 'success', text: response.data.message });
      handleCloseForwardModal();
    } catch (error) {
      console.error('Error setting call forwarding:', error);
      const errorMessage = error.response?.data?.message || 'Failed to set call forwarding.';
      setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
    }
  };

  const handleOpenAgentModal = (agent = null) => {
    setSelectedAgent(agent);
    setShowAgentModal(true);
  };

  const handleCloseAgentModal = () => {
    setShowAgentModal(false);
    setSelectedAgent(null);
  };

  const handleSaveAgent = async (agentData) => {
    setMessage(null);
    try {
      if (selectedAgent) {
        const response = await apiClient.put(`/api/agents/${selectedAgent._id}`, agentData);
        setAgents(agents.map((agent) => (agent._id === selectedAgent._id ? response.data.agent : agent)));
        setMessage({ type: 'success', text: 'Agent updated successfully!' });
      } else {
        const response = await apiClient.post(`/api/agents`, agentData);
        setAgents([...agents, response.data.agent]);
        setMessage({ type: 'success', text: 'Agent added successfully!' });
      }
      handleCloseAgentModal();
    } catch (error) {
      console.error('Error saving agent:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save agent.';
      setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
    }
  };

  const handleDeleteAgent = async (agentId) => {
    setMessage(null);
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await apiClient.delete(`/api/agents/${agentId}`);
        setAgents(agents.filter((agent) => agent._id !== agentId));
        setMessage({ type: 'success', text: 'Agent deleted successfully!' });
      } catch (error) {
        console.error('Error deleting agent:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete agent.';
        setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
      }
    }
  };

  const handleSearchNumbers = async () => {
    setMessage(null);
    setIsLoadingSearch(true);
    setAvailableNumbers([]);
    setSelectedNumbersToBuy([]);

    if (!areaCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter an area code.' });
      setIsLoadingSearch(false);
      return;
    }

    try {
      const response = await apiClient.get(`/api/twilio/search`, {
        params: { areaCode, numberType },
      });
      setAvailableNumbers(response.data.numbers);
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      console.error('Error searching numbers:', error);
      const errorMessage = error.response?.data?.message || 'Failed to search numbers.';
      setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleToggleNumberSelection = (number) => {
    setSelectedNumbersToBuy((prev) =>
      prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number]
    );
  };

  const handlePurchaseNumbers = async () => {
    setMessage(null);
    setIsLoadingPurchase(true);

    if (selectedNumbersToBuy.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one number to purchase.' });
      setIsLoadingPurchase(false);
      return;
    }

    const assignToAgentId = document.getElementById('assignToSelect')?.value;
    const defaultAgentForPurchase = assignToAgentId === 'Select an agent' || assignToAgentId === '' ? null : assignToAgentId;

    try {
      const numbersData = selectedNumbersToBuy.map((num) => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        capabilities: num.capabilities,
      }));

      const response = await apiClient.post(`/api/twilio/buy`, {
        numbersToBuy: numbersData,
        defaultAgentId: defaultAgentForPurchase,
      });

      setMessage({ type: 'success', text: response.data.message });
      setAvailableNumbers([]);
      setSelectedNumbersToBuy([]);

      const purchasedNumbersRes = await apiClient.get(`/api/twilio/purchased`);
      setPurchasedNumbers(purchasedNumbersRes.data.numbers || []);
    } catch (error) {
      console.error('Error purchasing numbers:', error);
      const errorMessage = error.response?.data?.message || 'Failed to purchase numbers.';
      setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
    } finally {
      setIsLoadingPurchase(false);
    }
  };

  const handleAssignPurchasedNumber = async (phoneNumberId, agentId) => {
    setMessage(null);
    try {
      const response = await apiClient.put(`/api/twilio/${phoneNumberId}/assign`, { agentId });
      setMessage({ type: 'success', text: response.data.message });
      setPurchasedNumbers((prev) =>
        prev.map((num) => (num._id === phoneNumberId ? response.data.phoneNumber : num))
      );
    } catch (error) {
      console.error('Error assigning number:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign number.';
      setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
    }
  };
  // --- NEW: Handle Export Numbers ---
    const handleExportNumbers = async () => {
        setIsLoadingExport(true);
        setMessage(null);
        try {
            const response = await apiClient.get(`/api/twilio/export`, {
                responseType: 'blob', // Important: responseType must be 'blob' for file downloads
            });

            if (response.status === 204) { // No Content
                setMessage({ type: 'info', text: 'No purchased numbers to export.' });
                return;
            }

            // Create a blob from the response data
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'purchased_twilio_numbers.csv'; // Suggested filename
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url); // Clean up the URL object

            setMessage({ type: 'success', text: 'Purchased numbers exported successfully!' });

        } catch (error) {
            console.error('Error exporting numbers:', error);
            const errorMessage = error.response?.data?.message || 'Failed to export numbers.';
            setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
        } finally {
            setIsLoadingExport(false);
        }
    };
    // --- END NEW ---
  if (isLoadingData) {
    return <div className="panel">Loading numbers dashboard...</div>;
  }

  const totalNumbers = purchasedNumbers.length;
  const activeNumbers = purchasedNumbers.filter((num) => num.status === 'active').length;
  const spamLikely = 0;
  const replacedNumbers = 0;

  return (
    <div className="panel">
      <div className="numbers-dashboard">
        <div className="stats-container">
          <div className="stat-card">
            <h3 className="stat-title">Total Numbers</h3>
            <div className="stat-content">
              <span className="stat-number">{totalNumbers}</span>
              <Phone className="stat-icon phone-icon" />
            </div>
          </div>
          <div className="stat-card">
            <h3 className="stat-title">Active Numbers</h3>
            <div className="stat-content">
              <span className="stat-number">{activeNumbers}</span>
              <Check className="stat-icon check-icon" />
            </div>
          </div>
          <div className="stat-card">
            <h3 className="stat-title">Spam Likely</h3>
            <div className="stat-content">
              <span className="stat-number">{spamLikely}</span>
              <X className="stat-icon x-icon" />
            </div>
          </div>
          <div className="stat-card">
            <h3 className="stat-title">Replaced Numbers</h3>
            <div className="stat-content">
              <span className="stat-number">{replacedNumbers}</span>
              <RefreshCw className="stat-icon refresh-icon" />
            </div>
          </div>
        </div>

         <div className="search-section">
                    <div className="search-header">
                        <h3 className="search-title">Search Phone Numbers</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="export-button" onClick={handleSyncFromTwilio} disabled={isSyncing}>
                            <RefreshCw className="download-icon" /> {isSyncing ? 'Syncing...' : 'Sync from Twilio'}
                          </button>
                          <button className="export-button" onClick={handleExportNumbers} disabled={isLoadingExport}>
                            <Download className="download-icon" /> {isLoadingExport ? 'Exporting...' : 'Export Numbers'}
                          </button>
                        </div>
                    </div>

          {message && (
            <div className={`status-message ${message.type}`}>
              {message.type === 'success' ? <Check className="check-icon" /> : <XCircle className="check-icon" />}
              <span className="status-text">{message.text}</span>
              {message.errors && message.errors.length > 0 && (
                <ul className="error-list">
                  {message.errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="search-filters">
            <div className="filter-group">
              <label className="filter-label">Area Code</label>
              <div className="search-input-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Enter area code (e.g. 415)"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                />
              </div>
            </div>
            <div className="filter-group">
              <label className="filter-label">Number Type</label>
              <select
                className="select-input"
                value={numberType}
                onChange={(e) => setNumberType(e.target.value)}
              >
                <option value="local">Local</option>
                <option value="tollFree">Toll-Free</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Assign To (Default for purchase)</label>
              <select id="assignToSelect" className="select-input">
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {`${agent.firstName} ${agent.lastName}`}
                  </option>
                ))}
              </select>
            </div>
            <button className="add-button" onClick={() => handleOpenAgentModal()}>
              <Plus className="plus-icon" />
              Add Agent
            </button>
          </div>

          <button
            className="search-button"
            onClick={handleSearchNumbers}
            disabled={isLoadingSearch}
          >
            <Search className="search-icon" />
            {isLoadingSearch ? 'Searching...' : 'Search Numbers'}
          </button>

          {availableNumbers.length > 0 && (
            <div className="available-numbers-section">
              <h3>Available Numbers ({availableNumbers.length})</h3>
              <table className="numbers-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Number</th>
                    <th>Friendly Name</th>
                    <th>Capabilities</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {availableNumbers.map((num, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedNumbersToBuy.includes(num)}
                          onChange={() => handleToggleNumberSelection(num)}
                        />
                      </td>
                      <td>{num.phoneNumber}</td>
                      <td>{num.friendlyName}</td>
                      <td>
                        {Object.entries(num.capabilities)
                          .filter(([, value]) => value)
                          .map(([key]) => key)
                          .join(', ')}
                      </td>
                      <td>{`${num.locality || ''}, ${num.region || ''} ${num.postalCode || ''}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedNumbersToBuy.length > 0 && (
                <button
                  className="save-button1"
                  onClick={handlePurchaseNumbers}
                  disabled={isLoadingPurchase}
                  style={{ marginTop: '20px' }}
                >
                  {isLoadingPurchase ? 'Purchasing...' : `Purchase Selected Numbers (${selectedNumbersToBuy.length})`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="purchased-numbers-section">
          <h3 className="purchased-title">Purchased Numbers ({purchasedNumbers.length})</h3>
          {purchasedNumbers.length === 0 ? (
            <div className="empty-state">
              <Phone className="empty-icon" />
              <p className="empty-message">No phone numbers purchased yet.</p>
              <p className="empty-description">Get started by searching and purchasing a phone number.</p>
            </div>
          ) : (
            <table className="numbers-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Friendly Name</th>
                  <th>Assigned To</th>
                  <th>Forward To</th>
                  <th>Capabilities</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchasedNumbers.map((num) => (
                  <tr key={num._id}>
                    <td>{num.phoneNumber}</td>
                    <td>{num.friendlyName}</td>
                    <td>
                      <select
                        className="select-input small-select"
                        value={num.assignedTo ? num.assignedTo._id : ''}
                        onChange={(e) => handleAssignPurchasedNumber(num._id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {agents.map((agent) => (
                          <option key={agent._id} value={agent._id}>
                            {`${agent.firstName} ${agent.lastName}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{num.forwardTo || 'Not set'}</td>
                    <td>
                      {Object.entries(num.capabilities)
                        .filter(([, value]) => value)
                        .map(([key]) => key)
                        .join(', ')}
                    </td>
                    <td>{num.status}</td>
                    <td>
                      <button
                        className="action-button-small"
                        title="Configure Call Forwarding"
                        onClick={() => handleOpenForwardModal(num)}
                      >
                        <Forward size={16} />
                      </button>
                      <button
                        className="action-button-small"
                        title="Release Number"
                        style={{ marginLeft: '5px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="agents-section">
          <h3 className="agents-title">Manage Agents ({agents.length})</h3>
          <button className="add-button1" onClick={() => handleOpenAgentModal()}>
            <Plus className="plus-icon" /> Add New Agent
          </button>
          <br />
          {agents.length === 0 ? (
            <p className="empty-message" style={{ textAlign: 'center', marginTop: '15px' }}>
              No agents added yet.
            </p>
          ) : (
            <table className="agents-table">
              <thead>
                <tr>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent._id}>
                    <td>{agent.firstName}</td>
                    <td>{agent.lastName}</td>
                    <td>{agent.email}</td>
                    <td>
                      <button
                        className="action-button-small"
                        onClick={() => handleOpenAgentModal(agent)}
                        title="Edit Agent"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-button-small"
                        onClick={() => handleDeleteAgent(agent._id)}
                        title="Delete Agent"
                        style={{ marginLeft: '5px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAgentModal && (
        <AgentModal
          agent={selectedAgent}
          onClose={handleCloseAgentModal}
          onSave={handleSaveAgent}
        />
      )}

      {showForwardModal && (
        <div className="modal-overlay">
          <div className="forward-modal">
            <div className="modal-header">
              <h2>Forward Number</h2>
              <button className="modal-close" onClick={handleCloseForwardModal}>
                <XCircle size={24} />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label htmlFor="forwardTo">Forward Number</label>
                <input
                  id="forwardTo"
                  type="text"
                  value={forwardToNumber}
                  onChange={(e) => setForwardToNumber(e.target.value)}
                  placeholder="Enter forwarding number (e.g., +1234567890)"
                  className="modal-input"
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={enableRecording}
                    onChange={(e) => setEnableRecording(e.target.checked)}
                  />
                  Enable Recording
                </label>
              </div>
              <div className="form-group">
                <label htmlFor="timeout">Timeout (seconds)</label>
                <input
                  id="timeout"
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(Number(e.target.value))}
                  min="1"
                  max="60"
                  className="modal-input"
                />
              </div>
              <div className="form-group">
                <label>Upload Voicemail MP3</label>
                <div className="file-upload">
                  <input
                    type="file"
                    id="voicemailFile"
                    accept="audio/mpeg"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <label htmlFor="voicemailFile" className="file-label">
                    Choose File
                  </label>
                  <span className="file-name">{voicemailFileName}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-button save" onClick={handleSaveForwarding}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}