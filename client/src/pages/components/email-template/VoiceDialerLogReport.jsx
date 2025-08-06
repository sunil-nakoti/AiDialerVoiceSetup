// frontend/src/pages/autodialer/VoiceDialerLogReport.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Home, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import apiClient from "../../../utils/apiClient";
import { toast } from 'react-toastify';
import "@/css/voiceDialerLogReport.css";

const VoiceDialerLogReport = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [voiceDialerLogsData, setVoiceDialerLogsData] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [campaignName, setCampaignName] = useState('Campaign Report');

  // Fetch campaign name
  const fetchCampaignName = useCallback(async () => {
    if (!campaignId) return;
    try {
      const response = await apiClient.get(`/api/dialer/campaigns`);
      const campaign = response.data.campaigns.find(c => c._id === campaignId);
      setCampaignName(campaign ? campaign.name : 'Unknown Campaign');
    } catch (err) {
      console.error("Error fetching campaign name:", err);
      setCampaignName('Error Loading Campaign Name');
    }
  }, [campaignId]);

  // Fetch voice dialer logs
  const fetchVoiceDialerLogs = useCallback(async () => {
    if (!campaignId) {
      setError("Campaign ID is missing.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/dialer/campaigns/${campaignId}/logs`, {
        params: {
          pageSize: entriesPerPage,
          page: currentPage,
          searchQuery: searchQuery,
        },
      });

      setVoiceDialerLogsData(response.data.voiceDialerLogs || []);
      setTotalEntries(response.data.totalEntries || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching voice dialer logs:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load voice dialer logs.';
      setError(errorMessage);
      toast.error(errorMessage);
      setVoiceDialerLogsData([]);
      setTotalEntries(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [campaignId, entriesPerPage, currentPage, searchQuery]);

  useEffect(() => {
    fetchCampaignName();
    fetchVoiceDialerLogs();
  }, [fetchVoiceDialerLogs, fetchCampaignName]);

  // Format status class
  const getStatusClass = (status) => {
    const normalizedStatus = String(status).toLowerCase();
    const statusMap = {
      'queued': 'status-pending',
      'dialing': 'status-pending',
      'answered': 'status-success',
      'completed': 'status-success',
      'failed': 'status-failed',
      'no-answer': 'status-warning',
      'busy': 'status-warning',
      'canceled': 'status-warning',
      'dnc-blocked': 'status-blocked',
      'compliance-blocked': 'status-blocked',
    };
    return `status-badge ${statusMap[normalizedStatus] || 'status-default'}`;
  };

  // Format duration
  const formatDurationDisplay = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Format date and time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  return (
    <div className="call-logs-container">
      {/* Header */}
      <div className="call-logs-header">
        <br></br><br></br>
        <div className="header-content">
          <h1 className="page-title">{campaignName} - Dialer Logs</h1>
          <div className="breadcrumb">
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <Home size={16} />
            </button>
            <span>Dashboard</span>
            <span className="separator">/</span>
            <button
              onClick={() => navigate('/dialer')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              Auto Dialer
            </button>
            <span className="separator">/</span>
            <span className="current">Campaign Logs</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="call-logs-content">
        {/* Controls Bar */}
        <div className="controls-bar">
          <div className="left-controls">
            <div className="entries-selector">
              <span className="label">Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="entries-select"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="label">entries</span>
            </div>
          </div>
          <div className="right-controls">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by phone, status, error..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="table-container">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading campaign logs...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button
                onClick={() => fetchVoiceDialerLogs()}
                className="retry-btn"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="call-logs-table">
                <thead>
                  <tr>
                    <th className="th-time">Time</th>
                    <th className="th-phone">Phone Number</th>
                    <th className="th-status">Status</th>
                    <th className="th-attempts">Attempts</th>
                    <th className="th-last-attempt">Last Attempt</th>
                    <th className="th-duration">Duration</th>
                    <th className="th-error">Error / Reason</th>
                    <th className="th-contact-name">Contact Name</th>
                    <th className="th-contact-email">Contact Email</th>
                  </tr>
                </thead>
                <tbody>
                  {voiceDialerLogsData.length > 0 ? (
                    voiceDialerLogsData.map((log) => {
                      const createdAt = formatDateTime(log.createdAt);
                      const lastAttemptAt = log.lastAttemptAt ? formatDateTime(log.lastAttemptAt) : null;
                      return (
                        <tr key={log._id} className="table-row">
                          <td className="td-time">
                            <div className="datetime-cell">
                              <span className="date">{createdAt.date}</span>
                              <span className="time">{createdAt.time}</span>
                            </div>
                          </td>
                          <td className="td-phone">
                            <span className="phone-number">{log.phoneNumber}</span>
                          </td>
                          <td className="td-status">
                            <span className={getStatusClass(log.status)}>
                              {log.status.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="td-attempts">
                            <span className="attempt-count">{log.attemptCount}</span>
                          </td>
                          <td className="td-last-attempt">
                            <div className="datetime-cell">
                              {lastAttemptAt ? (
                                <>
                                  <span className="date">{lastAttemptAt.date}</span>
                                  <span className="time">{lastAttemptAt.time}</span>
                                </>
                              ) : (
                                <span className="no-data">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="td-duration">
                            <span className="duration">{formatDurationDisplay(log.callDuration)}</span>
                          </td>
                          <td className="td-error">
                            <span className="error-reason">
                              {log.twilioCallDetails?.error || log.twilioCallDetails?.reason || '—'}
                            </span>
                          </td>
                          <td className="td-contact-name">
                            <span className="contact-name">
                              {log.contactId
                                ? `${log.contactId.firstName || 'N/A'} ${log.contactId.lastName || ''}`.trim()
                                : '—'}
                            </span>
                          </td>
                          <td className="td-contact-email">
                            <span className="contact-email">
                              {log.contactId ? log.contactId.email || '—' : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="no-data">
                        <div className="empty-state">
                          <Phone size={48} className="empty-icon" />
                          <h3>No Campaign Logs Found</h3>
                          <p>No voice dialer logs match your criteria for this campaign.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && totalEntries > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              <span>
                Showing <strong>{(currentPage - 1) * entriesPerPage + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * entriesPerPage, totalEntries)}</strong> of{' '}
                <strong>{totalEntries}</strong> entries
              </span>
            </div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="pagination-btn prev-btn"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page =>
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] < page - 1 && (
                        <span className="ellipsis">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`page-btn ${currentPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="pagination-btn next-btn"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceDialerLogReport;