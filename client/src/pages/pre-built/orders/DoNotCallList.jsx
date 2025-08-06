import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Download, ChevronRight, ChevronLeft, Calendar, Upload, Unlock, Trash2, Edit, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import ImportModal from './ImportModal';
import "@/css/DoNotCallList.css";

export default function DoNotCallList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false); // New state for unblock modal
  const [deleteContactId, setDeleteContactId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalContacts, setTotalContacts] = useState(0);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [selectedContacts, setSelectedContacts] = useState([]);

  // Toast auto-dismiss after 3 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast({ ...toast, visible: false }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type) => {
    setToast({ message, type, visible: true });
  };

  // Fetch contacts
  useEffect(() => {
    fetchContacts();
  }, [currentPage, entriesPerPage, searchTerm, startDate, endDate]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage,
        limit: entriesPerPage,
        search: searchTerm,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      }).toString();

      const response = await fetch(`http://localhost:5000/api/dnc?${query}`);
      const { success, data, totalContacts } = await response.json();

      if (success) {
        setContacts(data);
        setTotalContacts(totalContacts);
        setSelectedContacts([]);
      } else {
        showToast('Failed to fetch contacts.', 'error');
      }
    } catch (error) {
      showToast('Network error while fetching contacts.', 'error');
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const toggleDateFilter = () => {
    setShowDateFilter(!showDateFilter);
  };

  const handleImportSuccess = async (importedContacts) => {
    try {
      const response = await fetch('http://localhost:5000/api/dnc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedContacts),
      });
      const { success, duplicates } = await response.json();
      if (success) {
        setShowImportModal(false);
        if (duplicates && duplicates > 0) {
          showToast(`Imported ${importedContacts.length} contacts, ${duplicates} duplicates ignored.`, 'warning');
        } else {
          showToast(`Successfully imported ${importedContacts.length} contacts!`, 'success');
        }
        setTimeout(() => window.location.reload(), 3000);
      } else {
        showToast('Failed to import contacts.', 'error');
      }
    } catch (error) {
      showToast('Network error while importing contacts.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/dnc/${deleteContactId}`, {
        method: 'DELETE',
      });
      const { success } = await response.json();
      if (success) {
        showToast('Contact deleted successfully.', 'success');
        fetchContacts();
      } else {
        showToast('Failed to delete contact.', 'error');
      }
    } catch (error) {
      showToast('Network error while deleting contact.', 'error');
    }
    setShowDeleteModal(false);
    setDeleteContactId(null);
  };

  const handleSelectContact = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(contact => contact._id));
    }
  };

  const handleUnblock = async () => {
    if (selectedContacts.length === 0) {
      showToast('Please select at least one contact to unblock.', 'warning');
      return;
    }
    setShowUnblockModal(true); // Show unblock confirmation modal
  };

  const confirmUnblock = async () => {
    try {
      const promises = selectedContacts.map(id =>
        fetch(`http://localhost:5000/api/dnc/${id}`, {
          method: 'DELETE',
        })
      );
      
      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(res => res.json()));
      
      const allSuccess = results.every(result => result.success);
      
      if (allSuccess) {
        showToast(`Successfully unblocked ${selectedContacts.length} contact(s).`, 'success');
        setSelectedContacts([]);
        fetchContacts();
      } else {
        showToast('Failed to unblock some contacts.', 'error');
      }
    } catch (error) {
      showToast('Network error while unblocking contacts.', 'error');
    }
    setShowUnblockModal(false);
  };

  const handleSingleUnblock = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/dnc/${id}`, {
        method: 'DELETE',
      });
      const { success } = await response.json();
      if (success) {
        showToast('Contact unblocked successfully.', 'success');
        fetchContacts();
      } else {
        showToast('Failed to unblock contact.', 'error');
      }
    } catch (error) {
      showToast('Network error while unblocking contact.', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/dnc/export');
      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dnc-list.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Contacts exported successfully.', 'success');
    } catch (error) {
      showToast('Network error while exporting contacts.', 'error');
    }
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setCurrentPage(1);
    setSelectedContacts([]);
  };

  const totalPages = Math.ceil(totalContacts / entriesPerPage);
  const startEntry = (currentPage - 1) * entriesPerPage + 1;
  const endEntry = Math.min(currentPage * entriesPerPage, totalContacts);

  return (
    <div className="app-container">
      <div className="container">
        {toast.visible && (
          <div className={`toast toast-${toast.type}`}>
            <div className="toast-content">
              {toast.type === 'success' && <CheckCircle size={16} />}
              {toast.type === 'error' && <AlertCircle size={16} />}
              {toast.type === 'warning' && <AlertTriangle size={16} />}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <h2 className="modal-title">Confirm Delete</h2>
              <p>Are you sure you want to remove this contact from the DNC list?</p>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button className="sure-btn" onClick={handleDelete}>
                  Sure
                </button>
              </div>
            </div>
          </div>
        )}

        {showUnblockModal && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <h2 className="modal-title">Confirm Unblock</h2>
              <p>Are you sure you want to unblock {selectedContacts.length} contact(s) from the DNC list?</p>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setShowUnblockModal(false)}>
                  Cancel
                </button>
                <button className="sure-btn" onClick={confirmUnblock}>
                  Sure
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="page-header">
          <div className="header-content">
            <div>
              <h1 className="page-title">Do Not Call List</h1>
              <p className="page-description">Manage contacts that should not be called</p>
            </div>
            <div className="header-actions">
              <button className="import-button" onClick={() => setShowImportModal(true)}>
                <Upload size={16} />
                Import CSV
              </button>
              <button className="unblock-button" onClick={handleUnblock}>
                <Unlock size={16} />
                Unblock Selected
              </button>
            </div>
          </div>
        </header>

        <div className="content-panel">
          <div className="toolbar">
            <div className="entries-selector">
              <span>Show</span>
              <select
                className="entries-select"
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            <div className="toolbar-actions">
              <div className="search-container">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search DNC list..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>

              <div className="filter-section">
                <button className="filter-button" onClick={toggleDateFilter}>
                  <SlidersHorizontal size={16} />
                  <span>Filters</span>
                  <span className={`arrow ${showDateFilter ? 'up' : 'down'}`}></span>
                </button>

                <button className="export-button" onClick={handleExport}>
                  <Download size={16} />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

          {showDateFilter && (
            <div className="date-filter-panel">
              <div className="date-filter-container">
                <div className="date-field">
                  <label htmlFor="start-date">Start Date:</label>
                  <div className="date-input-wrapper">
                    <input
                      type="date"
                      id="start-date"
                      className="date-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Calendar size={16} className="calendar-icon" />
                  </div>
                </div>

                <div className="date-field">
                  <label htmlFor="end-date">End Date:</label>
                  <div className="date-input-wrapper">
                    <input
                      type="date"
                      id="end-date"
                      className="date-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    <Calendar size={16} className="calendar-icon" />
                  </div>
                </div>

                <button className="apply-filter-button" onClick={fetchContacts}>
                  Apply Filter
                </button>
                <button className="reset-filter-button" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </div>
          )}

          <div className="table-container">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : contacts.length === 0 ? (
              <div className="no-results">
                <p>No DNC contacts found matching your criteria.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={selectedContacts.length === contacts.length && contacts.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>#</th>
                    <th>Name</th>
                    <th>Phone Number</th>
                    <th>Email</th>
                    <th>Date Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact, index) => (
                    <tr key={contact._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact._id)}
                          onChange={() => handleSelectContact(contact._id)}
                        />
                      </td>
                      <td>{startEntry + index}</td>
                      <td>{contact.name}</td>
                      <td>{contact.phone}</td>
                      <td>{contact.email}</td>
                      <td>{new Date(contact.dateAdded).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          {/* <button className="action-btn edit-btn" title="Edit">
                            <Edit size={14} />
                          </button> */}
                          <button
                            className="action-btn unblock-btn"
                            onClick={() => handleSingleUnblock(contact._id)}
                            title="Unblock"
                          >
                            <Unlock size={14} />
                          </button>
                            {/* <button
                              className="action-btn delete-btn"
                              onClick={() => {
                                setDeleteContactId(contact._id);
                                setShowDeleteModal(true);
                              }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pagination">
            <div className="page-info">
              Showing {contacts.length > 0 ? startEntry : 0} to {endEntry} of {totalContacts} entries
            </div>
            <div className="page-controls">
              <button
                className="page-button previous"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="page-numbers">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                className="page-button next"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}