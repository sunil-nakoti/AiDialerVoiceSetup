// src/components/OptimizedDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { Clock, Phone, Users, XCircle, MessageSquare, Check, AlertTriangle, Clock3, RefreshCw } from 'lucide-react';
// import axios from 'axios'; // ADD axios import
import apiClient from "../utils/apiClient";
import "@/css/homepage.css";

export default function OptimizedDashboard() {
    const [dashboardStats, setDashboardStats] = useState({
        calls: {
            active: 0,
            connectedAgents: 0,
            avgCallDuration: '0:00', // This will now be a string from the API
            failed: 0,
        },
        campaigns: {
            total: 0,
            running: 0,
            paused: 0,
            completed: 0,
        },
        compliance: {
            violations: 0,
            dncBlocked: 0,
            complianceBlocked: 0,
            complianceScore: 100, // Added compliance score here
        },
        system: {
            aggregatedCPM: 0,
        },
        sms: { // Static SMS data as requested
            sent: 124,
            delivered: 118,
            failed: 6,
            queued: 12,
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

    // Helper function to format seconds into MM:SS (can handle both number and string from API)
    const formatDuration = (duration) => {
        if (typeof duration === 'number') {
            if (isNaN(duration) || duration < 0) return "00:00";
            const minutes = Math.floor(duration / 60);
            const remainingSeconds = Math.floor(duration % 60); // Ensure seconds are whole numbers
            return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        }
        return duration || '0:00'; // If it's already a string or null/undefined, return as is or default
    };

    const fetchDashboardStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch metrics from the existing compliance metrics endpoint
            const response = await apiClient.get(`/api/compliance/metrics`);
            const data = response.data;

            // Assuming you also need campaign counts that are NOT in compliance/metrics currently.
            // If you have a separate endpoint for general campaign counts, use it here.
            // Otherwise, we'll fetch them directly in this function (or make a new backend endpoint).
            const campaignsResponse = await apiClient.get(`/api/dialer/campaigns`); // Fetch campaigns to count them
            const campaigns = campaignsResponse.data.campaigns || [];

            const totalCampaigns = campaigns.length;
            const runningCampaigns = campaigns.filter(c => c.status === 'running').length;
            const pausedCampaigns = campaigns.filter(c => c.status === 'paused').length;
            const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;


            setDashboardStats(prevStats => ({
                ...prevStats, // Keep existing static SMS data and initial structure
                calls: {
                    active: data.activeCalls || 0,
                    connectedAgents: data.connectedAgents || 0,
                    avgCallDuration: data.avgCallDuration || '0:00', // avgCallDuration is already MM:SS from complianceController
                    failed: data.failedCalls || 0,
                },
                campaigns: {
                    total: totalCampaigns,
                    running: runningCampaigns,
                    paused: pausedCampaigns,
                    completed: completedCampaigns,
                },
               compliance: {
violations: data.totalViolations || 0, // Get from backend data
 dncBlocked: data.dncBlocked || 0, // Get from backend data
complianceBlocked: data.complianceBlocked || 0, // Get from backend data
 complianceScore: data.complianceScore !== undefined ? parseFloat(data.complianceScore.toFixed(1)) : 100,
 },
                system: {
                    aggregatedCPM: data.callsPerMinute || 0,
                },
                // SMS stats remain static from initial state
            }));
        } catch (err) {
            console.error("Failed to fetch dashboard stats:", err.response?.data || err.message);
            setError("Failed to load dashboard data. Please ensure the backend is running and the /api/compliance/metrics endpoint is accessible.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect hook to fetch data on component mount and set up an auto-refresh
    useEffect(() => {
        fetchDashboardStats();
        // Refresh data every 30 seconds
        const intervalId = setInterval(fetchDashboardStats, 30000);
        // Clean up the interval when the component unmounts
        return () => clearInterval(intervalId);
    }, [fetchDashboardStats]);

    // Conditional rendering for loading and error states
    if (loading) {
        return <div className="dashboard-container"><p>Loading dashboard data...</p></div>;
    }

    if (error) {
        return <div className="dashboard-container"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h4>Dashboard</h4>
                <div className="system-status">
                    <div className="status-indicator">
                        <Clock size={14} className="status-icon" />
                        <span className="status-label">System Status:</span>
                        <span className="status-value">Online</span>
                    </div>
                    <button className="refresh-button" onClick={fetchDashboardStats} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
                    </button>
                </div>
            </div>

            <h2 className="section-title">Call Statistics</h2>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Active Calls</div>
                        <div className="stat-icon phone5">
                            <Phone size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.calls.active}</div>
                    <div className="stat-change positive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        <span>Live Data</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Connected Agents</div>
                        <div className="stat-icon agents5">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.calls.connectedAgents}</div>
                    <div className="stat-change positive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>Current Status</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Avg. Call Duration</div>
                        <div className="stat-icon duration5">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{formatDuration(dashboardStats.calls.avgCallDuration)}</div>
                    <div className="stat-change positive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        <span>Overall Average</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Failed Calls</div>
                        <div className="stat-icon failed5">
                            <XCircle size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.calls.failed}</div>
                    <div className="stat-change negative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Calculated Today</span>
                    </div>
                </div>
            </div>

            {/* --- Campaign Overview Section --- */}
            <h2 className="section-title">Campaign Overview</h2>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Total Campaigns</div>
                        <div className="stat-icon phone5"> {/* Reusing icon, adjust as needed */}
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.campaigns.total}</div>
                    <div className="stat-change positive">
                        <span>Overall Count</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Running Campaigns</div>
                        <div className="stat-icon agents5"> {/* Reusing icon */}
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.campaigns.running}</div>
                    <div className="stat-change positive">
                        <span>Currently Active</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Paused Campaigns</div>
                        <div className="stat-icon duration5"> {/* Reusing icon */}
                            <Clock3 size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.campaigns.paused}</div>
                    <div className="stat-change">
                        <span>User Paused</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Completed Campaigns</div>
                        <div className="stat-icon failed5"> {/* Reusing icon */}
                            <Check size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.campaigns.completed}</div>
                    <div className="stat-change positive">
                        <span>Finished Campaigns</span>
                    </div>
                </div>
            </div>

            {/* --- Compliance Statistics Section --- */}
            <h2 className="section-title">Compliance Statistics</h2>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Compliance Score</div>
                        <div className="stat-icon agents5">
                            <Users size={16} /> {/* Or a more compliance-related icon */}
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.compliance.complianceScore.toFixed(1)}%</div>
                    <div className="stat-change positive">
                        <span>Overall Health</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Total Violations</div>
                        <div className="stat-icon failed5">
                            <AlertTriangle size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.compliance.violations}</div>
                    <div className="stat-change negative">
                        <span>Historical Count</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">DNC Blocked Calls</div>
                        <div className="stat-icon failed5">
                            <XCircle size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.compliance.dncBlocked}</div>
                    <div className="stat-change negative">
                        <span>Today's Blocks</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Other Compliance Blocks</div>
                        <div className="stat-icon failed5">
                            <XCircle size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.compliance.complianceBlocked}</div>
                    <div className="stat-change negative">
                        <span>Today's Blocks</span>
                    </div>
                </div>
            </div>

            {/* <h2 className="section-title">SMS Statistics</h2>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Sent SMS</div>
                        <div className="stat-icon sms5">
                            <MessageSquare size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.sms.sent}</div>
                    <div className="stat-change positive">
                        <span>N/A</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Delivered SMS</div>
                        <div className="stat-icon delivered5">
                            <Check size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.sms.delivered}</div>
                    <div className="stat-change positive">
                        <span>N/A</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Failed SMS</div>
                        <div className="stat-icon failed5">
                            <AlertTriangle size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.sms.failed}</div>
                    <div className="stat-change negative">
                        <span>N/A</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-label">Queued SMS</div>
                        <div className="stat-icon queued5">
                            <Clock3 size={16} />
                        </div>
                    </div>
                    <div className="stat-value">{dashboardStats.sms.queued}</div>
                    <div className="stat-change">
                        <span>N/A</span>
                    </div>
                </div>
            </div> */}

            <div className="control-panel">
                <div className="control-card">
                    <h3 className="control-title">Current Aggregated Dialing Rate</h3>
                    <div className="control-content">
                        <div className="rate-display">
                            <span className="current-rate">{dashboardStats.system.aggregatedCPM}</span>
                            <span className="rate-unit">calls per minute (CPM)</span>
                        </div>
                        <p className="note">This reflects the average CPM of all active campaigns.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}