// frontend/src/components/CallLogs.jsx
import React, { useState, useEffect } from 'react';
import { Search, Home, ChevronLeft, ChevronRight, Play, Download, Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import apiClient from "../../../utils/apiClient";
import "@/css/calllog.css";

const CallLogs = () => {
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [callLogsData, setCallLogsData] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch call logs from backend
  useEffect(() => {
    const fetchCallLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/api/call-logs`, {
          params: {
            pageSize: entriesPerPage,
            page: currentPage,
            searchQuery: searchQuery,
          },
        });
        
        setCallLogsData(response.data.callLogs || []);
        setTotalEntries(response.data.totalEntries || 0);
        setTotalPages(response.data.totalPages || 1);
        
      } catch (err) {
        console.error('Error fetching call logs:', err);
        setError('Failed to load call logs. Please check your backend server or network connection.');
        setCallLogsData([]);
        setTotalEntries(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    fetchCallLogs();
  }, [entriesPerPage, currentPage, searchQuery]);

  // Helper function to get status class for styling
  const getStatusClass = (status) => {
    const normalizedStatus = String(status).toLowerCase();
    const statusMap = {
      'completed': 'status-success',
      'answered': 'status-success',
      'failed': 'status-failed',
      'no-answer': 'status-warning',
      'busy': 'status-warning',
      'canceled': 'status-warning',
      'dnc-blocked': 'status-blocked',
      'compliance-blocked': 'status-blocked',
      'initiated': 'status-pending',
      'dialing': 'status-pending',
      'ringing': 'status-pending'
    };
    return `status-badge ${statusMap[normalizedStatus] || 'status-default'}`;
  };

  // Helper function to get type class and icon
  const getTypeInfo = (type) => {
    const normalizedType = String(type).toLowerCase();
    if (normalizedType === 'inbound') {
      return {
        class: 'type-inbound',
        icon: <PhoneIncoming size={14} />,
        text: 'INBOUND'
      };
    } else {
      return {
        class: 'type-outbound',
        icon: <PhoneOutgoing size={14} />,
        text: 'OUTBOUND'
      };
    }
  };

  // Format duration display
  const formatDurationDisplay = (durationString) => {
    if (typeof durationString === 'string' && durationString.includes(':')) {
      return durationString;
    }
    const seconds = parseInt(durationString, 10);
    if (isNaN(seconds) || seconds < 0) {
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
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    };
  };

  return (
    <div className="call-logs-container">
      {/* Header */}
      <div className="call-logs-header">
        <br></br>        <br></br>

        <div className="header-content">
          <h1 className="page-title">Call Logs</h1>
          <div className="breadcrumb">
            <Home size={16} />
            <span>Dashboard</span>
            <span className="separator">/</span>
            <span className="current">Call Logs</span>
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
                <option value={100}>100</option>
              </select>
              <span className="label">entries</span>
            </div>
          </div>

          <div className="right-controls">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by phone, status, type..."
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
              <p>Loading call logs...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()} 
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
                    <th className="th-time">Date & Time</th>
                    <th className="th-to">To</th>
                    <th className="th-from">From</th>
                    <th className="th-type">Type</th>
                    <th className="th-duration">Duration</th>
                    <th className="th-recording">Recording</th>
                    <th className="th-cost">Cost</th>
                    <th className="th-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {callLogsData.length > 0 ? (
                    callLogsData.map((log) => {
                      const dateTime = formatDateTime(log.time);
                      const typeInfo = getTypeInfo(log.type);
                      
                      return (
                        <tr key={log._id} className="table-row">
                          <td className="td-time">
                            <div className="datetime-cell">
                              <span className="date">{dateTime.date}</span>
                              <span className="time">{dateTime.time}</span>
                            </div>
                          </td>
                          <td className="td-phone">
                            <span className="phone-number">{log.to}</span>
                          </td>
                          <td className="td-phone">
                            <span className="phone-number">{log.from}</span>
                          </td>
                          <td className="td-type">
                            <div className={`type-badge ${typeInfo.class}`}>
                              {typeInfo.icon}
                              <span>{typeInfo.text}</span>
                            </div>
                          </td>
                          <td className="td-duration">
                            <span className="duration">{formatDurationDisplay(log.duration)}</span>
                          </td>
                          <td className="td-recording">
                            {log.recordingUrl ? (
                              <div className="recording-actions">
                                <button 
                                  className="recording-btn play-btn"
                                  onClick={() => window.open(log.recordingUrl, '_blank')}
                                  title="Play Recording"
                                >
                                  <Play size={14} />
                                </button>
                                <button 
                                  className="recording-btn download-btn"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = log.recordingUrl;
                                    link.download = `recording-${log._id}.mp3`;
                                    link.click();
                                  }}
                                  title="Download Recording"
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="no-recording">—</span>
                            )}
                          </td>
                          <td className="td-cost">
                            <span className="cost">{log.cost || '—'}</span>
                          </td>
                          <td className="td-status">
                            <span className={getStatusClass(log.status)}>
                              {log.status.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="no-data">
                        <div className="empty-state">
                          <Phone size={48} className="empty-icon" />
                          <h3>No Call Records Found</h3>
                          <p>There are no call logs matching your criteria.</p>
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

export default CallLogs;