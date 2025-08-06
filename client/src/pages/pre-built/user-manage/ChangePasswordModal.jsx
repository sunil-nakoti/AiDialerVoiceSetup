import React, { useState } from "react";
import Swal from "sweetalert2";
import apiClient from "../../../utils/apiClient"; // Assuming this is your configured Axios instance
import "@/css/ChangePasswordModal.css"; // You'll need to create this CSS file

const ChangePasswordModal = ({ isOpen, onClose, userRole, userId }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setError("All fields are required.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError("New password and confirm password do not match.");
            return;
        }

        if (newPassword.length < 6) { // Example password strength validation
            setError("New password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            // apiClient's interceptor will automatically attach the token
            // No need to manually get token from localStorage here or set headers
            let apiUrl = '';
            if (userRole === 'admin') {
                apiUrl = '/api/auth/change-password'; // Base URL is handled by apiClient
            } else if (userRole === 'agent') {
                apiUrl = '/api/agents/change-password'; // Base URL is handled by apiClient
            } else {
                throw new Error("Invalid user role for password change.");
            }

            const response = await apiClient.post(apiUrl, { // Use apiClient.post
                currentPassword,
                newPassword,
                confirmNewPassword
            });

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: response.data.message || 'Password updated successfully!',
                timer: 2000,
                showConfirmButton: false
            });
            onClose(true); // Close modal and trigger refresh
        } catch (err) {
            console.error("Password change error:", err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to change password. Please try again.');
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: err.response?.data?.message || 'Failed to change password.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="import-modal" style={{ maxWidth: "500px" }}> {/* Reusing import-modal class for styling */}
                <div className="modal-header">
                    <h2>Change Password</h2>
                    <button className="close-button" onClick={() => onClose(false)}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="step-content">
                    {error && <div className="alert alert-danger">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="current-password">Current Password</label>
                        <input
                            type="password"
                            id="current-password"
                            className="form-control"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="new-password">New Password</label>
                        <input
                            type="password"
                            id="new-password"
                            className="form-control"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirm-new-password">Confirm New Password</label>
                        <input
                            type="password"
                            id="confirm-new-password"
                            className="form-control"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal-footer" style={{ justifyContent: 'flex-end', paddingTop: '20px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => onClose(false)} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? "Changing..." : "Change Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
