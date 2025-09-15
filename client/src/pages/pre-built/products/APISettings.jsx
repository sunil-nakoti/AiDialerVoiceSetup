import { useState, useEffect } from 'react';
import { Eye, Check, Phone, RefreshCw, XCircle } from 'lucide-react';
import axios from 'axios'; // Recommended for cleaner HTTP requests

export default function APISettings() {
  const [selectedPanel, setSelectedPanel] = useState('voice');
  const [showToken, setShowToken] = useState(false);
  const [accountSID, setAccountSID] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '', errors: [] }
  const [isSaving, setIsSaving] = useState(false);

  // Base URL for your API, adjust if your frontend isn't served from the same domain
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';


  // --- Fetch settings on component mount ---
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings`);
        const data = response.data;

        setAccountSID(data.accountSID || "");
        setAuthToken(data.authToken || ""); // Fetched token is already decrypted by backend hook
        if (data.provider) {
          setSelectedPanel(data.provider.toLowerCase());
        }
        setMessage({ type: 'success', text: data.message });

      } catch (error) {
        console.error('Error fetching settings:', error);
        const errorMessage = error.response?.data?.message || 'Network error while fetching settings.';
        setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // --- Save Changes Handler ---
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setMessage(null); // Clear previous messages

    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings`, {
        accountSID,
        authToken,
        provider:'Twilio',
      });

      const data = response.data;
      setMessage({ type: 'success', text: data.message });
      // The backend sends back the masked token, so update state to reflect that
      setAuthToken(data.settings.authToken); // Will be '••••••••••••••••••••••••••••••••'

    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save settings.';
      setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Verify Credentials Handler ---
  const handleVerifyCredentials = async () => {
    setIsVerifying(true);
    setMessage(null); // Clear previous messages

    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings/verify`, {
        accountSID,
        authToken,
        provider: selectedPanel === 'voice' ? 'Twilio' : 'OtherProvider',
      });

      const data = response.data;
      setMessage({ type: 'success', text: data.message });

    } catch (error) {
      console.error('Error verifying credentials:', error);
      const errorMessage = error.response?.data?.message || 'Verification failed.';
      setMessage({ type: 'error', text: errorMessage, errors: error.response?.data?.errors });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return <div className="panel">Loading API settings...</div>;
  }
 
  return (
    <div className="panel">
      <div className="provider-section">
        <h2 className="section-title">Voice & SMS Provider</h2>
        <div className="provider-options">
          <div
            className={`provider-card ${selectedPanel === 'voice' ? 'active' : ''}`}
            onClick={() => setSelectedPanel('voice')}
          >
            <Phone className="provider-icon" />
            <div className="status-badge enabled">
              <div className="status-dot"></div>
              Enabled
            </div>
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

        <div className="credentials-section">
          <div className="credential-row">
            <label className="credential-label">Account SID</label>
            <div className="credential-input-container">
              <input
                type="text"
                className="credential-input"
                value={accountSID}
                onChange={(e) => setAccountSID(e.target.value)}
              />
            </div>
          </div>

          <div className="credential-row">
            <label className="credential-label">Auth Token</label>
            <div className="credential-input-container">
              <input
                type={showToken ? "text" : "password"}
                className="credential-input"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowToken(!showToken)}
              >
                <Eye className="eye-icon" />
              </button>
            </div>
          </div>

          <div className="button-row">
            <button
              className="save-button1"
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              className={`verify-button ${isVerifying ? 'verifying' : ''}`}
              onClick={handleVerifyCredentials}
              disabled={isVerifying}
            >
              <RefreshCw className={`refresh-icon ${isVerifying ? 'spinning' : ''}`} />
              {isVerifying ? 'Verifying...' : 'Verify Credentials'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}