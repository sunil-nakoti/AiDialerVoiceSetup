import React, { useState, useEffect, useCallback } from 'react';
import "@/css/ComplianceDashboard.css";
import { Clock, AlertCircle, Shield, Check, Search, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from "../../../utils/apiClient"; // Assuming this is your configured Axios instance

const ComplianceDashboard = () => {
    const [callingHours, setCallingHours] = useState({ startTime: '08:00', endTime: '21:00' });
    const [complianceSettings, setComplianceSettings] = useState({
        dailyAttemptsLimit: 0,
        weeklyAttemptsLimit: 0,
        totalAttemptsLimit: 0,
        enforceTcpa: true,
        enforceFdcpa: true,
    });
    const [complianceMetrics, setComplianceMetrics] = useState({
        totalAttempts: 0,
        tcpaViolations: 0,
        fdcpaViolations: 0,
        complianceRate: '0.0%',
        dailyAttempts: 0,
        weeklyAttempts: 0,
    });
    const [violations, setViolations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValue, setFilterValue] = useState('All');
    // Add these new state variables at the top of your component
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 5;

    const formatTimeToDisplay = (time24) => {
        return time24;
    };

    const parseTimeFromDisplay = (timeDisplay) => {
        return timeDisplay;
    };

    const fetchComplianceData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch compliance metrics
            const metricsResponse = await apiClient.get('/api/compliance/metrics');
            const metrics = metricsResponse.data; // Axios puts the response data in the 'data' property
            setComplianceMetrics({
                totalAttempts: metrics.totalAttempts || 0,
                tcpaViolations: metrics.tcpaViolations || 0,
                fdcpaViolations: metrics.fdcpaViolations || 0,
                complianceRate: metrics.complianceRate || '0.0%',
                dailyAttempts: metrics.totalCallsToday || 0,
                weeklyAttempts: 0,
            });

            // Fetch compliance settings
            const settingsResponse = await apiClient.get('/api/compliance/settings');
            const settings = settingsResponse.data; // Axios puts the response data in the 'data' property
            setComplianceSettings({
                dailyAttemptsLimit: typeof settings.dailyAttemptsLimit === 'number' ? settings.dailyAttemptsLimit : 0,
                weeklyAttemptsLimit: typeof settings.weeklyAttemptsLimit === 'number' ? settings.weeklyAttemptsLimit : 0,
                totalAttemptsLimit: typeof settings.totalAttemptsLimit === 'number' ? settings.totalAttemptsLimit : 0,
                enforceTcpa: typeof settings.enforceTcpa === 'boolean' ? settings.enforceTcpa : true,
                enforceFdcpa: typeof settings.enforceFdcpa === 'boolean' ? settings.enforceFdcpa : true,
            });
            setCallingHours({
                startTime: settings.callingHours?.startTime || '08:00',
                endTime: settings.callingHours?.endTime || '21:00',
            });

            // Fetch violations log
            const violationsResponse = await apiClient.get('/api/compliance/violations');
            const fetchedViolations = violationsResponse.data; // Axios puts the response data in the 'data' property
            setViolations(fetchedViolations);

        } catch (err) {
            console.error("Error fetching compliance data:", err);
            // Axios errors often have a 'response' object with 'data' and 'status'
            if (err.response) {
                setError(err.response.data.message || `Server error: ${err.response.status}`);
            } else {
                setError(err.message || 'An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchComplianceData();
        const interval = setInterval(fetchComplianceData, 60000);
        return () => clearInterval(interval);
    }, [fetchComplianceData]);

    const handleSaveSettings = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/api/compliance/settings', {
                ...complianceSettings,
                callingHours: {
                    startTime: parseTimeFromDisplay(callingHours.startTime),
                    endTime: parseTimeFromDisplay(callingHours.endTime)
                }
            });
            // No need to check response.ok, Axios throws for non-2xx status codes by default
            alert('Compliance settings saved successfully!');
            fetchComplianceData();
        } catch (err) {
            console.error("Error saving compliance settings:", err);
            if (err.response) {
                setError(err.response.data.message || `Failed to save settings: Server error ${err.response.status}`);
                alert(`Error saving settings: ${err.response.data.message || 'Server error'}`);
            } else {
                setError(err.message || 'An unknown error occurred.');
                alert(`Error saving settings: ${err.message || 'An unknown error occurred'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportViolations = async () => {
        try {
            // For file downloads, Axios needs responseType: 'blob'
            const response = await apiClient.get('/api/compliance/violations/export', {
                responseType: 'blob' // Important for binary data like CSV
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compliance_violations.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            alert('Violations exported successfully!');
        } catch (err) {
            console.error("Error exporting violations:", err);
            if (err.response) {
                // If the server sends an error as JSON for a blob request,
                // you might need to read it as text first
                const errorBlob = err.response.data;
                const reader = new FileReader();
                reader.onload = function() {
                    try {
                        const errorData = JSON.parse(reader.result);
                        alert(`Error exporting violations: ${errorData.message || 'Server error'}`);
                        setError(errorData.message);
                    } catch (e) {
                        alert(`Error exporting violations: ${err.message || 'An unexpected error occurred during export.'}`);
                        setError(err.message);
                    }
                };
                reader.readAsText(errorBlob);
            } else {
                alert(`Error exporting violations: ${err.message || 'An unknown error occurred.'}`);
                setError(err.message);
            }
        }
    };

    const filteredViolations = violations.filter(violation => {
        const matchesSearch = searchQuery === '' ||
            violation.phoneNumber.includes(searchQuery) ||
            (violation.type && violation.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (violation.reason && violation.reason.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFilter = filterValue === 'All' || (violation.type && violation.type === filterValue);

        return matchesSearch && matchesFilter;
    });

    if (isLoading) {
        return <div className="dashboard-container loading-message">Loading compliance data...</div>;
    }

    if (error) {
        return <div className="dashboard-container error-message">Error: {error}. Please check your server and try again.</div>;
    }

    // Calculate the indexes for slicing the array
const indexOfLastRow = currentPage * rowsPerPage;
const indexOfFirstRow = indexOfLastRow - rowsPerPage;
const currentRows = filteredViolations.slice(indexOfFirstRow, indexOfLastRow);

// Calculate the total number of pages
const totalPages = Math.ceil(filteredViolations.length / rowsPerPage);

 // Function to generate page numbers
    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5; // You can adjust this number
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`page-number ${currentPage === i ? 'active' : ''}`}
                >
                    {i}
                </button>
            );
        }
        return pageNumbers;
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header1">
                <div className="title-container">
                    <h1>Compliance</h1>
                    <p className="subtitle">Monitor compliance rules</p>
                </div>
                <button className="export-button" onClick={handleExportViolations}>
                    <span className="download-icon">↓</span> Export
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Total Attempts</div>
                        <div className="stat-icon phone5">
                            <Clock size={24} />
                        </div>
                    </div>
                    <div className="stat-value">{complianceMetrics.totalAttempts}</div> {/* Display totalAttempts */}
                    <div className="stat-change positive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        <span>+12% vs last hour</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">TCPA Violations</div>
                        <div className="stat-icon agents5">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                    <div className="stat-value">{complianceMetrics.tcpaViolations}</div> {/* Display tcpaViolations */}
                    <div className="stat-change positive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>92% online</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">FDCPA Violations</div>
                        <div className="stat-icon duration5">
                            <Shield size={24} />
                        </div>
                    </div>
                    <div className="stat-value">{complianceMetrics.fdcpaViolations}</div> {/* Display fdcpaViolations */}
                    <div className="stat-change positive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        <span>+5% vs yesterday</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Compliance Rate</div>
                        <div className="stat-icon failed5">
                            <Check size={24} />
                        </div>
                    </div>
                    <div className="stat-value">{complianceMetrics.complianceRate}</div> {/* Display complianceRate */}
                    <div className="stat-change negative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>2% failure rate</span>
                    </div>
                </div>
            </div>

            <div className="content-container">
                <div className="settings-panel">
                    <h2>Settings</h2>
                    <div className="settings-form">
                        <div className="setting-item">
                            <div className="setting-label">Daily Attempts</div>
                            <input
                                type="number"
                                className="setting-value"
                                value={complianceSettings.dailyAttemptsLimit}
                                onChange={(e) => setComplianceSettings(prev => ({ ...prev, dailyAttemptsLimit: parseInt(e.target.value) || 0 }))}
                            />
                        </div>

                        <div className="setting-item">
                            <div className="setting-label">Weekly Attempts</div>
                            <input
                                type="number"
                                className="setting-value"
                                value={complianceSettings.weeklyAttemptsLimit}
                                onChange={(e) => setComplianceSettings(prev => ({ ...prev, weeklyAttemptsLimit: parseInt(e.target.value) || 0 }))}
                            />
                        </div>

                        <div className="setting-item">
                            <div className="setting-label">Total Attempts</div>
                            <input
                                type="number"
                                className="setting-value"
                                value={complianceSettings.totalAttemptsLimit}
                                onChange={(e) => setComplianceSettings(prev => ({ ...prev, totalAttemptsLimit: parseInt(e.target.value) || 0 }))}
                            />
                        </div>

                        <div className="setting-item checkbox-item">
                            <input
                                type="checkbox"
                                id="tcpa"
                                checked={complianceSettings.enforceTcpa}
                                onChange={(e) => setComplianceSettings(prev => ({ ...prev, enforceTcpa: e.target.checked }))}
                            />
                            <label htmlFor="tcpa">Enforce TCPA Rules</label>
                        </div>

                        <div className="setting-item checkbox-item">
                            <input
                                type="checkbox"
                                id="fdcpa"
                                checked={complianceSettings.enforceFdcpa}
                                onChange={(e) => setComplianceSettings(prev => ({ ...prev, enforceFdcpa: e.target.checked }))}
                            />
                            <label htmlFor="fdcpa">Enforce FDCPA Rules</label>
                        </div>

                        <div className="setting-label">Calling Hours</div>
                        <div className="time-inputs">
                            <div className="time-input-container">
                                <input
                                    type="text"
                                    value={formatTimeToDisplay(callingHours.startTime)}
                                    onChange={(e) => setCallingHours(prev => ({ ...prev, startTime: e.target.value }))}
                                    className="time-input"
                                />
                                <div className="time-icon">
                                    <Clock size={16} />
                                </div>
                            </div>

                            <div className="time-input-container">
                                <input
                                    type="text"
                                    value={formatTimeToDisplay(callingHours.endTime)}
                                    onChange={(e) => setCallingHours(prev => ({ ...prev, endTime: e.target.value }))}
                                    className="time-input"
                                />
                                <div className="time-icon">
                                    <Clock size={16} />
                                </div>
                            </div>
                        </div>

                        <button className="save-button" onClick={handleSaveSettings} disabled={isLoading}>
                            <Save size={16} /> {isLoading ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>

                <div className="violations-panel">
    <h2>Violations</h2>
    <div className="violations-header">
        <div className="search-filter-container">
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>
            <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="filter-select"
            >
                <option value="All">All</option>
                <option value="TCPA">TCPA</option>
                <option value="FDCPA">FDCPA</option>
            </select>
        </div>
    </div>

    <div className="violations-content">
        {filteredViolations.length > 0 ? (
            <>
                <table className="violations-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Phone Number</th>
                            <th>Type</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((violation) => (
                            <tr key={violation._id || violation.timestamp}>
                                <td>{new Date(violation.timestamp).toLocaleString()}</td>
                                <td>{violation.phoneNumber}</td>
                                <td>
                                    <span className={`violation-type-badge ${violation.type ? violation.type.toLowerCase() : ''}`}>
                                        {violation.type}
                                    </span>
                                </td>
                                <td>{violation.reason}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
               {/* New Pagination Controls */}
                            {totalPages > 1 && (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      marginTop: '24px',
    }}
  >
    {/* Previous Button */}
    <button
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      style={{
        padding: '8px 20px',
        fontSize: '14px',
        borderRadius: '20px',
        border: 'none',
        backgroundColor: currentPage === 1 ? '#d3d3d3' : '#007bff',
        color: '#fff',
        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
        boxShadow: currentPage === 1 ? 'none' : '0 2px 5px rgba(0,0,0,0.1)',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
        transform: currentPage === 1 ? 'none' : 'scale(1)',
      }}
      onMouseOver={e => {
        if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#0056b3';
      }}
      onMouseOut={e => {
        if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#007bff';
      }}
    >
      ◀ Previous
    </button>

    {/* Next Button */}
    <button
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages}
      style={{
        padding: '8px 20px',
        fontSize: '14px',
        borderRadius: '20px',
        border: 'none',
        backgroundColor: currentPage === totalPages ? '#d3d3d3' : '#007bff',
        color: '#fff',
        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
        boxShadow: currentPage === totalPages ? 'none' : '0 2px 5px rgba(0,0,0,0.1)',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
        transform: currentPage === totalPages ? 'none' : 'scale(1)',
      }}
      onMouseOver={e => {
        if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = '#0056b3';
      }}
      onMouseOut={e => {
        if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = '#007bff';
      }}
    >
      Next ▶
    </button>
  </div>
)}
                            </>
                        ) : (
            <div className="no-violations-message">
                {searchQuery || filterValue !== 'All'
                    ? `No compliance violations found matching "${searchQuery}" or filter "${filterValue}".`
                    : 'No compliance violations found. Great job!'}
            </div>
        )}
    </div>
</div>
            </div>
        </div>
    );
};

export default ComplianceDashboard;