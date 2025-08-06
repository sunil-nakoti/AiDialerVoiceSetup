import React, { useState, useEffect, useCallback } from "react";
import { Upload, Users, RefreshCw, Plus, Mail, Phone, User, Check, Ban, AlertTriangle, Trash2, Eye, Download } from "lucide-react";
import ImportContactModal from "./ImportContactModal";
import "@/css/contact.css";
import Swal from "sweetalert2";
import apiClient from "../../../utils/apiClient";

const Contact = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalGroups: 0,
    dncList: 0,
    contactsWithEmail: 0,
    contactsWithPhone: 0,
    avgContactsPerGroup: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const contactsPerPage = 10;
  const groupsPerPage = 5;
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [groupCurrentPage, setGroupCurrentPage] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.get('api/contacts/dashboard-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch dashboard stats. Please try again.',
      });
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await apiClient.get('api/contacts/groups');
      setGroups(response.data || []);
    } catch (error) {
      console.error('Failed to fetch groups', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch groups. Please try again.',
      });
    }
  };

  const fetchGroupContacts = async (groupId, page) => {
    try {
      const response = await apiClient.get(`api/contacts/groups/${groupId}`, {
        params: { page, limit: contactsPerPage }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching contacts for group ${groupId}:`, error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch group contacts. Please try again.',
      });
      return { contacts: [], totalPages: 1, totalContacts: 0, currentPage: 1 };
    }
  };

  const fetchContacts = useCallback(async (page, search) => {
    setLoading(true);
    try {
      const response = await apiClient.get('api/contacts', {
        params: { page, limit: contactsPerPage, search },
      });
      setContacts(response.data.contacts || []);
      setCurrentPage(response.data.currentPage || 1);
      setStats(prev => ({
        ...prev,
        totalContacts: response.data.totalContacts || 0
      }));
    } catch (error) {
      console.error('Failed to fetch contacts', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch contacts. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    fetchGroups();
    fetchContacts(1, '');
  }, [fetchContacts]);

  const openModal = () => setIsModalOpen(true);

  const closeModal = (refreshNeeded = false) => {
    setIsModalOpen(false);
    if (refreshNeeded) {
      fetchDashboardStats();
      fetchGroups();
      fetchContacts(1, '');
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Contacts imported successfully!',
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleRefresh = () => {
    fetchDashboardStats();
    fetchGroups();
    fetchContacts(1, '');
    Swal.fire({
      icon: 'info',
      title: 'Refreshing',
      text: 'Data is being refreshed...',
      timer: 1000,
      showConfirmButton: false,
    });
  };

  const handleDeleteContact = async (contactId, groupId = null) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this contact?',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`api/contacts/${contactId}`);
        setContacts(prev => prev.filter(contact => contact._id !== contactId));
        if (groupId) {
          setGroups(prev => prev.map(group => 
            group._id === groupId 
              ? { ...group, contactCount: group.contactCount - 1 }
              : group
          ));
        }
        fetchDashboardStats();
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Contact deleted successfully!',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Error deleting contact:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete contact. Please try again.',
        });
      }
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this group and all its contacts?',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`api/contacts/groups/${groupId}`);
        setGroups(prev => prev.filter(group => group._id !== groupId));
        fetchDashboardStats();
        fetchContacts(1, searchTerm); // Refresh contacts list
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Group and associated contacts deleted successfully!',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Error deleting group:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete group. Please try again.',
        });
      }
    }
  };

  const openViewModal = (contact) => {
    setSelectedContact(contact);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedContact(null);
  };

  const handleCreateNewGroup = async () => {
    const { value: groupName } = await Swal.fire({
      title: 'Create New Group',
      input: 'text',
      inputLabel: 'Enter group name',
      inputPlaceholder: 'Group name',
      showCancelButton: true,
      confirmButtonText: 'Next',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Group name is required!';
        }
      },
    });

    if (!groupName) return;

    const { value: groupDescription } = await Swal.fire({
      title: 'Group Description',
      input: 'textarea',
      inputLabel: 'Enter group description (optional)',
      inputPlaceholder: 'Group description',
      showCancelButton: true,
      confirmButtonText: 'Create',
      cancelButtonText: 'Cancel',
    });

    if (groupName) {
      try {
        await apiClient.post('api/contacts/groups', {
          name: groupName,
          description: groupDescription || '',
        });
        fetchGroups();
        fetchDashboardStats();
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Group "${groupName}" created successfully!`,
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Error creating group:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to create group. Please try again.',
        });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "N/A" : `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const calculatePercentage = (value, total) => {
    if (total === 0) return "0.0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // const handleSearchSubmit = (e) => {
  //   e.preventDefault();
  //   setCurrentPage(1); // Reset to first page on new search
  //   fetchContacts(1, searchTerm);
  // };

  const handleSearchSubmit = (e) => {
  e.preventDefault();
  setLoading(true);
  setCurrentPage(1); // Reset to first page on new search
  fetchContacts(1, searchTerm).then(() => {
    setLoading(false);
  }).catch((error) => {
    console.error('Search failed:', error);
    setLoading(false);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to search contacts. Please try again.',
    });
  });
};

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= Math.ceil(stats.totalContacts / contactsPerPage)) {
      setCurrentPage(pageNumber);
      fetchContacts(pageNumber, searchTerm);
    }
  };

  const indexOfLastGroup = groupPage * groupsPerPage;
  const indexOfFirstGroup = indexOfLastGroup - groupsPerPage;
  const currentGroups = groups.slice(indexOfFirstGroup, indexOfLastGroup);
  const totalGroupPages = Math.ceil(groups.length / groupsPerPage);

  const handleGroupPageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalGroupPages) {
      setGroupPage(pageNumber);
    }
  };

  const handleGroupExpand = async (groupId) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      if (!(groupId in groupCurrentPage)) {
        setGroupCurrentPage(prev => ({ ...prev, [groupId]: 1 }));
        const groupData = await fetchGroupContacts(groupId, 1);
        setGroups(prev => prev.map(group => 
          group._id === groupId ? { ...group, contacts: groupData.contacts, totalContacts: groupData.totalContacts, totalPages: groupData.totalPages } : group
        ));
      }
    }
  };

  const handleGroupPageChangeForContacts = async (groupId, pageNumber) => {
    const group = groups.find(g => g._id === groupId);
    if (group) {
      const totalGroupPages = Math.ceil(group.totalContacts / contactsPerPage);
      if (pageNumber >= 1 && pageNumber <= totalGroupPages) {
        setGroupCurrentPage(prev => ({ ...prev, [groupId]: pageNumber }));
        const groupData = await fetchGroupContacts(groupId, pageNumber);
        setGroups(prev => prev.map(g => 
          g._id === groupId ? { ...g, contacts: groupData.contacts, totalContacts: groupData.totalContacts, totalPages: groupData.totalPages } : g
        ));
      }
    }
  };

  return (
    <div className="contact-dashboard">
      <div className="dashboard-header">
        <h4>Contact Dashboard</h4>
        <div className="dashboard-actions">
          <button className="btn btn-light" onClick={handleRefresh}>
            <RefreshCw size={16} className="btn-icon" /> Refresh
          </button>
          <a
            href="/sample.csv"
            download="sample.csv"
            className="btn btn-success"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Download size={16} className="btn-icon" /> Sample File
          </a>
          <button className="btn btn-primary" onClick={openModal}>
            <Upload size={16} className="btn-icon" /> Import Contacts
          </button>
          <button className="btn btn-light" onClick={handleCreateNewGroup}>
            <Plus size={16} className="btn-icon" /> New Group
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading data...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-label">Total Contacts</div>
                <div className="stat-icon phone5"><Users size={20} /></div>
              </div>
              <div className="stat-value">{stats.totalContacts}</div>
              <div className="stat-change positive">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                <span>Updated just now</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-label">Total Groups</div>
                <div className="stat-icon agents5"><Check size={20} /></div>
              </div>
              <div className="stat-value">{stats.totalGroups}</div>
              <div className="stat-change positive">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>-</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-label">DNC List</div>
                <div className="stat-icon duration5"><Ban size={20} /></div>
              </div>
              <div className="stat-value">{stats.dncList}</div>
              <div className="stat-change neutral">
                <span>{calculatePercentage(stats.dncList, stats.totalContacts)}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-label">Wrong Numbers</div>
                <div className="stat-icon failed5"><AlertTriangle size={20} /></div>
              </div>
              <div className="stat-value">{stats.wrongNumbers || 0}</div>
              <div className="stat-change neutral">
                <span>{calculatePercentage(stats.wrongNumbers || 0, stats.totalContacts)}</span>
              </div>
            </div>
          </div>

          <div className="detail-stats-grid">
            <div className="detail-stat-card">
              <div className="detail-stat-content">
                <div className="detail-stat-label">Contacts with Email</div>
                <div className="detail-stat-value">
                  {stats.contactsWithEmail} ({calculatePercentage(stats.contactsWithEmail, stats.totalContacts)})
                </div>
              </div>
              <div className="detail-stat-icon purple"><Mail size={18} /></div>
            </div>
            <div className="detail-stat-card">
              <div className="detail-stat-content">
                <div className="detail-stat-label">Contacts with Phone</div>
                <div className="detail-stat-value">
                  {stats.contactsWithPhone} ({calculatePercentage(stats.contactsWithPhone, stats.totalContacts)})
                </div>
              </div>
              <div className="detail-stat-icon blue"><Phone size={18} /></div>
            </div>
            <div className="detail-stat-card">
              <div className="detail-stat-content">
                <div className="detail-stat-label">Avg. Contacts per Group</div>
                <div className="detail-stat-value">{stats.avgContactsPerGroup}</div>
              </div>
              <div className="detail-stat-icon green"><User size={18} /></div>
            </div>
          </div>

          <div className="section-container">
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="section-title" style={{ margin: 0 }}>Contact Groups</h2>
            </div>

            <div className="group-cards-container" style={{ maxHeight: "500px", overflowY: "auto" }}>
              {currentGroups.length > 0 ? (
                <>
                  {currentGroups.map((group) => (
                    <div className="group-card" key={group._id}>
                      <div className="group-info">
                        <h3 className="group-name">{group.name || "Unnamed Group"}</h3>
                        <div className="group-description">{group.description || "No description"}</div>
                        <div className="group-created">Created by admin</div>
                      </div>
                      <div className="group-meta">
                       {/* <div className="group-contacts">{group.contactCount !== undefined ? group.contactCount : 0} contacts</div> */}
                        <div className="group-date">{formatDate(group.createdAt)}</div>
                        <div className="group-actions">
                          <button
                            onClick={() => handleDeleteGroup(group._id)}
                            style={{ backgroundColor: "#f44336", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", marginRight: "8px" }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = "#d32f2f")}
                            onMouseOut={(e) => (e.target.style.backgroundColor = "#f44336")}
                          >
                            <Trash2 size={16} color="#fff" />
                          </button>
                          <button
                            onClick={() => handleGroupExpand(group._id)}
                            style={{ backgroundColor: "#007bff", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer" }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
                            onMouseOut={(e) => (e.target.style.backgroundColor = "#007bff")}
                          >
                            <Eye size={16} color="#fff" />
                          </button>
                        </div>
                      </div>
                      {expandedGroupId === group._id && (
                        <div className="group-contacts-table" style={{ marginTop: "10px" }}>
                          <table className="contacts-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(group.contacts || []).map((contact) => (
                                <tr key={contact._id}>
                                  <td>{`${contact.firstName || "N/A"} ${contact.lastName || ""}`}</td>
                                  <td>{contact.mailingAddress || "N/A"}</td>
                                  <td>{contact.phone1 || contact.phone2 || contact.phone3 || "N/A"}</td>
                                  <td>
                                    {contact.propertyAddress ? (
                                      `${contact.propertyAddress}, ${contact.propertyCity || ""} ${contact.propertyState || ""} ${contact.propertyZip || ""}`
                                    ) : (
                                      "N/A"
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => openViewModal(contact)}
                                      style={{ backgroundColor: "#007bff", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", marginRight: "8px" }}
                                      onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
                                      onMouseOut={(e) => (e.target.style.backgroundColor = "#007bff")}
                                    >
                                      <Eye size={16} color="#fff" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteContact(contact._id, group._id)}
                                      style={{ backgroundColor: "#f44336", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer" }}
                                      onMouseOver={(e) => (e.target.style.backgroundColor = "#d32f2f")}
                                      onMouseOut={(e) => (e.target.style.backgroundColor = "#f44336")}
                                    >
                                      <Trash2 size={16} color="#fff" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "10px" }}>
                            <button
                              className="btn-primary"
                              onClick={() => handleGroupPageChangeForContacts(group._id, (groupCurrentPage[group._id] || 1) - 1)}
                              disabled={(groupCurrentPage[group._id] || 1) === 1}
                              style={{
                                padding: "8px 16px",
                                margin: "0 5px",
                                backgroundColor: (groupCurrentPage[group._id] || 1) === 1 ? "#ccc" : "#007bff",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: (groupCurrentPage[group._id] || 1) === 1 ? "not-allowed" : "pointer",
                              }}
                            >
                              Previous
                            </button>
                            <span style={{ margin: "0 10px", fontWeight: "bold" }}>
                              Page {(groupCurrentPage[group._id] || 1)} of {group.totalPages || 1}
                            </span>
                            <button
                              className="btn-primary"
                              onClick={() => handleGroupPageChangeForContacts(group._id, (groupCurrentPage[group._id] || 1) + 1)}
                              disabled={(groupCurrentPage[group._id] || 1) === (group.totalPages || 1)}
                              style={{
                                padding: "8px 16px",
                                margin: "0 5px",
                                backgroundColor: (groupCurrentPage[group._id] || 1) === (group.totalPages || 1) ? "#ccc" : "#007bff",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: (groupCurrentPage[group._id] || 1) === (group.totalPages || 1) ? "not-allowed" : "pointer",
                              }}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pagination" style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                    <button
                      onClick={() => handleGroupPageChange(groupPage - 1)}
                      disabled={groupPage === 1}
                      style={{ padding: "8px 16px", margin: "0 5px", backgroundColor: groupPage === 1 ? "#ccc" : "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: groupPage === 1 ? "not-allowed" : "pointer" }}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalGroupPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handleGroupPageChange(page)}
                        style={{ padding: "8px 16px", margin: "0 5px", backgroundColor: groupPage === page ? "#0056b3" : "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => handleGroupPageChange(groupPage + 1)}
                      disabled={groupPage === totalGroupPages}
                      style={{ padding: "8px 16px", margin: "0 5px", backgroundColor: groupPage === totalGroupPages ? "#ccc" : "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: groupPage === totalGroupPages ? "not-allowed" : "pointer" }}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><Users size={32} className="text-gray-300" /></div>
                  <div className="empty-title">No contact groups</div>
                  <div className="empty-message">Create a group to organize your contacts</div>
                  <button className="btn btn-primary mt-4" onClick={handleCreateNewGroup}>
                    <Plus size={16} className="btn-icon" /> Create New Group
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="section-container">
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="section-title" style={{ margin: 0 }}>Recent Contacts</h2>
              {/* <form onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </form> */}
            </div>

            {contacts.length > 0 ? (
              <div className="contacts-table-container" style={{ maxHeight: "500px", overflowY: "auto" }}>
                <table className="contacts-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact._id}>
                        <td>{`${contact.firstName || "N/A"} ${contact.lastName || ""}`}</td>
                        <td>{contact.mailingAddress || "N/A"}</td>
                        <td>{contact.phone1 || contact.phone2 || contact.phone3 || "N/A"}</td>
                        <td>
                          {contact.propertyAddress ? (
                            `${contact.propertyAddress}, ${contact.propertyCity || ""} ${contact.propertyState || ""} ${contact.propertyZip || ""}`
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => openViewModal(contact)}
                            style={{ backgroundColor: "#007bff", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", marginRight: "8px" }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
                            onMouseOut={(e) => (e.target.style.backgroundColor = "#007bff")}
                          >
                            <Eye size={16} color="#fff" />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact._id)}
                            style={{ backgroundColor: "#f44336", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer" }}
                            onMouseOver={(e) => (e.target.style.backgroundColor = "#d32f2f")}
                            onMouseOut={(e) => (e.target.style.backgroundColor = "#f44336")}
                          >
                            <Trash2 size={16} color="#fff" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "20px" }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{ padding: "8px 16px", margin: "0 5px", backgroundColor: currentPage === 1 ? "#ccc" : "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                  >
                    Previous
                  </button>
                  <span style={{ margin: "0 10px", fontWeight: "bold" }}>
                    Page {currentPage} of {Math.ceil(stats.totalContacts / contactsPerPage) || 1}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(stats.totalContacts / contactsPerPage) || stats.totalContacts === 0}
                    style={{ padding: "8px 16px", margin: "0 5px", backgroundColor: currentPage === Math.ceil(stats.totalContacts / contactsPerPage) || stats.totalContacts === 0 ? "#ccc" : "#007bff", color: "#fff", border: "none", borderRadius: "6px", cursor: currentPage === Math.ceil(stats.totalContacts / contactsPerPage) || stats.totalContacts === 0 ? "not-allowed" : "pointer" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><Upload size={32} className="text-gray-300" /></div>
                <div className="empty-title">No contacts found</div>
                <div className="empty-message">Import contacts to see them here</div>
                <button className="btn btn-primary mt-4" onClick={openModal}>
                  <Upload size={16} className="btn-icon" /> Import Contacts
                </button>
              </div>
            )}
          </div>

          {isViewModalOpen && selectedContact && (
            <div className="modal-overlay">
              <div className="import-modal" style={{ maxWidth: "600px" }}>
                <div className="modal-header">
                  <h2>Contact Details</h2>
                  <button className="close-button" onClick={closeViewModal}>×</button>
                </div>
                <div className="step-content">
                  <div className="contact-details">
                    <div className="detail-item">
                      <strong>Name:</strong> {`${selectedContact.firstName || "N/A"} ${selectedContact.lastName || ""}`}
                    </div>
                    <div className="detail-item">
                      <strong>Email:</strong> {selectedContact.mailingAddress || "N/A"}
                    </div>
                    <div className="detail-item">
                      <strong>Phone 1:</strong> {selectedContact.phone1 || "N/A"}
                    </div>
                    <div className="detail-item">
                      <strong>Phone 2:</strong> {selectedContact.phone2 || "N/A"}
                    </div>
                    <div className="detail-item">
                      <strong>Phone 3:</strong> {selectedContact.phone3 || "N/A"}
                    </div>
                    <div className="detail-item">
                      <strong>Mailing Address:</strong> 
                      {selectedContact.mailingAddress ? (
                        `${selectedContact.mailingAddress}, ${selectedContact.mailingCity || ""} ${selectedContact.mailingState || ""} ${selectedContact.mailingZip || ""}`
                      ) : (
                        "N/A"
                      )}
                    </div>
                    <div className="detail-item">
                      <strong>Property Address:</strong> 
                      {selectedContact.propertyAddress ? (
                        `${selectedContact.propertyAddress}, ${selectedContact.propertyCity || ""} ${selectedContact.propertyState || ""} ${selectedContact.propertyZip || ""}`
                      ) : (
                        "N/A"
                      )}
                    </div>
                    <div className="detail-item">
                      <strong>Created At:</strong> {formatDate(selectedContact.createdAt)}
                    </div>
                    <div className="detail-item">
                      <strong>Updated At:</strong> {formatDate(selectedContact.updatedAt)}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={closeViewModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <ImportContactModal 
            isOpen={isModalOpen} 
            onClose={(refreshNeeded) => closeModal(refreshNeeded)} 
          />
        </>
      )}
    </div>
  );
};

export default Contact;