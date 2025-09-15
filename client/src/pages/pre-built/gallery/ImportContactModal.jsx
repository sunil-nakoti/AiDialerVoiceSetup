import React, { useState, useEffect } from "react";
import { Upload, Check, ArrowRight, RotateCcw, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";
import "@/css/ImportContactModal.css";

const ImportContactModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState({
    columns: [
      "FIRSTNAME", "LASTNAME", "MAILINGADDRESS", "MAILINGCITY", "MAILINGSTATE", "MAILINGZIP",
      "PROPERTYADDRESS", "PROPERTYCITY", "PROPERTYSTATE", "PROPERTYZIP", "PHONE1", "PHONE2", "PHONE3", "TIMEZONE"
    ],
    data: [{
      FIRSTNAME: "Deep", LASTNAME: "nk", MAILINGADDRESS: "suny25@gmail.com", MAILINGCITY: "usa",
      MAILINGSTATE: "usa", MAILINGZIP: "123456789", PROPERTYADDRESS: "usa", PROPERTYCITY: "usa",
      PROPERTYSTATE: "usa", PROPERTYZIP: "123456", PHONE1: "1234567890", PHONE2: "1234567890", PHONE3: "1234567890", TIMEZONE: "America/Los_Angeles"
    }]
  });
  const [mappings, setMappings] = useState({});
  const [showPreview, setShowPreview] = useState(true);
  const [groupOption, setGroupOption] = useState("create");
  const [newGroupName, setNewGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [existingGroups, setExistingGroups] = useState([]);
  // Step 1: Add state for selected existing group
  const [selectedExistingGroupId, setSelectedExistingGroupId] = useState("");

  const fieldMappings = {
    'FIRSTNAME': 'firstName', 'LASTNAME': 'lastName', 'MAILINGADDRESS': 'mailingAddress',
    'MAILINGCITY': 'mailingCity', 'MAILINGSTATE': 'mailingState', 'MAILINGZIP': 'mailingZip',
    'PROPERTYADDRESS': 'propertyAddress', 'PROPERTYCITY': 'propertyCity',
    'PROPERTYSTATE': 'propertyState', 'PROPERTYZIP': 'propertyZip',
    'PHONE1': 'phone1', 'PHONE2': 'phone2', 'PHONE3': 'phone3', 'TIMEZONE': 'timeZone'
  };

  useEffect(() => {
    if (isOpen && groupOption === "existing") {
      fetchGroups();
      // Reset selected group when switching to "existing" or opening modal
      setSelectedExistingGroupId("");
    }
  }, [isOpen, groupOption]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050'}/api/contacts/groups`);
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setExistingGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load contact groups. Please try again.',
      });
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrorMessage("");
      
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050'}/api/contacts/parse-csv`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to parse CSV file');
        }
        
        const data = await response.json();
        setPreviewData({
          columns: data.columns,
          data: data.data.slice(0, 5)
        });
        
        handleAutoMap(data.columns);
        Swal.fire({
          icon: 'success',
          title: 'File Uploaded',
          text: `Successfully parsed ${selectedFile.name}!`,
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        setErrorMessage('Error parsing CSV file: ' + error.message);
        Swal.fire({
          icon: 'error',
          title: 'Upload Error',
          text: `Error parsing CSV file: ${error.message}`,
        });
      }
    }
  };

  const handleAutoMap = (columns = previewData.columns) => {
    const newMappings = {};
    columns.forEach(column => {
      const normalized = column.toUpperCase().trim();
      if (fieldMappings[normalized]) {
        newMappings[column] = fieldMappings[normalized];
      } else if (normalized.includes('FIRST')) {
        newMappings[column] = 'firstName';
      } else if (normalized.includes('LAST')) {
        newMappings[column] = 'lastName'; 
      } else if (normalized.includes('EMAIL')) {
        newMappings[column] = 'mailingAddress';
      }
    });
    
    setMappings(newMappings);
    Swal.fire({
      icon: 'success',
      title: 'Auto-Mapping Complete',
      text: 'Columns have been automatically mapped!',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleImport = async () => {
    if (!hasRequiredMappings()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'First Name and Last Name mappings are required!',
      });
      return;
    }

    if (groupOption === "create" && !newGroupName) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please provide a group name for new group creation!',
      });
      return;
    }

    // Step 4: Update validation to use selectedExistingGroupId
    if (groupOption === "existing" && !selectedExistingGroupId) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select an existing group!',
      });
      return;
    }

    try {
      setIsImporting(true);
      setErrorMessage("");
      
      const importData = {
        mappings,
        groupInfo: {
          option: groupOption,
          newGroupName: groupOption === 'create' ? newGroupName : '',
          groupDescription: groupOption === 'create' ? groupDescription : '',
          // Step 4: Use selectedExistingGroupId
          existingGroupId: groupOption === 'existing' ? selectedExistingGroupId : ''
        },
        fileName: file.name
      };
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importConfig', JSON.stringify(importData));
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050'}/api/contacts/import`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }
      
      setImportSuccess(true);
      Swal.fire({
        icon: 'success',
        title: 'Import Successful',
        text: `${previewData.data.length} contacts imported successfully!`,
        timer: 2000,
        showConfirmButton: false
      });
      setTimeout(() => onClose(true), 2000);
    } catch (error) {
      setErrorMessage('Import failed: ' + error.message);
      Swal.fire({
        icon: 'error',
        title: 'Import Failed',
        text: `Import failed: ${error.message}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      handleFileUpload({ target: { files: [droppedFile] } });
    } else {
      setErrorMessage('Please upload a CSV file');
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please upload a CSV file!',
      });
    }
  };

  const handleSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    if (!searchTerm) return;
    
    const filteredColumns = previewData.columns.filter(column => 
      column.toLowerCase().includes(searchTerm)
    );
    
    if (filteredColumns.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Results',
        text: 'No columns match your search term.',
        timer: 1500,
        showConfirmButton: false
      });
    }
    console.log('Filtered columns:', filteredColumns);
  };

  const hasRequiredMappings = () => {
    let hasFirstName = false;
    let hasLastName = false;
    
    Object.values(mappings).forEach(value => {
      if (value === 'firstName') hasFirstName = true;
      if (value === 'lastName') hasLastName = true;
    });
    
    return hasFirstName && hasLastName;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="import-modal">
        <div className="modal-header">
          <h2>Import Contacts</h2>
          <p>Import bulk contacts into database</p>
          <button className="close-button" onClick={() => onClose(false)}>×</button>
        </div>

        <div className="steps-container">
          {[
            { icon: <Upload size={20} />, title: "Upload File", desc: "Upload your CSV file" },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2v-4H8v-2h4V7h2v4h4v2h-4v4z"/></svg>, title: "Map Columns", desc: "Map CSV columns to contact fields" },
            { icon: <Check size={20} />, title: "Validate", desc: "Validate your data" }
          ].map((step, index) => (
            <div key={index} className={`step-item ${currentStep >= index + 1 ? "active" : ""}`}>
              <div className="step-icon">
                <div className="icon-container">{step.icon}</div>
              </div>
              <div className="step-text">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {importSuccess && <div className="success-message"><Check size={20} /> Import successful! {previewData.data.length} contacts imported.</div>}

        {currentStep === 1 && (
          <div className="step-content">
            <div className="file-upload-area" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
              <input type="file" id="csv-upload" accept=".csv" className="hidden-input" onChange={handleFileUpload} />
              <label htmlFor="csv-upload" className="upload-label">
                <div className="upload-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                  </svg>
                </div>
                <div className="upload-text">Drag and drop your CSV file here, or click to select file</div>
                <div className="upload-info">Only CSV files are supported</div>
              </label>
              {file && <div className="selected-file"><span>Selected file: {file.name}</span></div>}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="step-content">
            <div className="mapping-tools">
              <input 
                type="text" 
                placeholder="Search columns..." 
                className="search-input" 
                onChange={handleSearch}
              />
              <button className="auto-map-btn" onClick={() => handleAutoMap()}>
                <RotateCcw size={16} /> Auto-Map
              </button>
              <button className="sort-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 15V9"></path><path d="M11 11v4"></path><path d="M15 9v6"></path>
                </svg>
              </button>
              <button className="preview-toggle" onClick={() => setShowPreview(!showPreview)}>
                <ChevronUp size={16} /> {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
            </div>

            {showPreview && (
              <div className="data-preview">
                <h3>Data Preview</h3>
                <div className="preview-info">First {previewData.data.length} rows of your data</div>
                <div className="table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {previewData.columns.map((column, index) => <th key={index}>{column}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {previewData.columns.map((column, colIndex) => (
                            <td key={colIndex}>{row[column]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mapping-section">
              {previewData.columns.map((column, index) => {
                const sampleValue = previewData.data.length > 0 ? previewData.data[0][column] : '';
                return (
                  <div className="mapping-item" key={index}>
                    <div className="mapping-source">
                      <div className="source-label">
                        {column} {index < 2 && <span className="required-tag">Required</span>}
                      </div>
                      <div className="source-preview">Preview: {sampleValue || 'N/A'}</div>
                    </div>
                    <div className="mapping-target">
                      <select 
                        className="mapping-select"
                        value={mappings[column] || ''}
                        onChange={(e) => setMappings({...mappings, [column]: e.target.value})}
                      >
                        <option value="">-- Do Not Import --</option>
                        <option value="firstName">First Name</option>
                        <option value="lastName">Last Name</option>
                        <option value="mailingAddress">Mailing Address</option>
                        <option value="mailingCity">Mailing City</option>
                        <option value="mailingState">Mailing State</option>
                        <option value="mailingZip">Mailing Zip</option>
                        <option value="propertyAddress">Property Address</option>
                        <option value="propertyCity">Property City</option>
                        <option value="propertyState">Property State</option>
                        <option value="propertyZip">Property Zip</option>
                        <option value="phone1">Phone 1</option>
                        <option value="phone2">Phone 2</option>
                        <option value="phone3">Phone 3</option>
                        <option value="timeZone">TimeZone</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="step-content">
            <div className="validation-summary">
              <h3>Import Summary</h3>
              {[
                { label: "File Name", value: file ? file.name : "sample.csv" },
                { label: "Total Records", value: previewData.data.length },
                { label: "Mapped Columns", value: `${Object.keys(mappings).length} of ${previewData.columns.length}` },
                { 
                  label: "Validation Status", 
                  value: hasRequiredMappings() ? 
                    <><Check size={16} /> Valid</> : 
                    <>⚠ First Name and Last Name mapping required</>,
                  className: hasRequiredMappings() ? 'valid' : 'invalid'
                }
              ].map((item, index) => (
                <div className="summary-item" key={index}>
                  <div className="summary-label">{item.label}</div>
                  <div className={`summary-value ${item.className || ''}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="group-section">
              <h3>Contact Group</h3>
              <div className="group-options">
                {["create", "existing"].map(option => (
                  <div className="group-option" key={option}>
                    <input 
                      type="radio" 
                      id={`${option}-group`}
                      name="group-option" 
                      value={option}
                      checked={groupOption === option}
                      onChange={() => setGroupOption(option)}
                    />
                    <label htmlFor={`${option}-group`}>
                      <div className="option-title">
                        {option === "create" ? "Create New Group" : "Use Existing Group"}
                      </div>
                      <div className="option-description">
                        {option === "create" ? "Create a new group for these contacts" : "Add contacts to an existing group"}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              
              {groupOption === "create" ? (
                <>
                  <div className="form-group">
                    <label htmlFor="group-name">New Group Name*</label>
                    <input 
                      type="text" 
                      id="group-name" 
                      placeholder="Enter group name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="group-description">Description (Optional)</label>
                    <textarea 
                      id="group-description" 
                      placeholder="Enter group description"
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label htmlFor="existing-group-select">Select Group</label>
                  {/* Step 2: Update select to use state */}
                  <select 
                    id="existing-group-select"
                    value={selectedExistingGroupId}
                    onChange={(e) => setSelectedExistingGroupId(e.target.value)}
                  >
                    <option value="">Select a group</option>
                    {existingGroups.map(group => (
                      <option key={group._id} value={group._id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="modal-footer">
          {currentStep > 1 && (
            <button className="btn btn-secondary" onClick={() => setCurrentStep(currentStep - 1)}>
              Back
            </button>
          )}
          
          {currentStep < 3 ? (
            <button 
              className="btn btn-primary" 
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !file}
            >
              Next Step <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={handleImport}
              // Step 3: Update disabled condition
              disabled={
                (groupOption === "create" && !newGroupName) || 
                isImporting || 
                !hasRequiredMappings() ||
                (groupOption === "existing" && !selectedExistingGroupId)
              }
            >
              {isImporting ? "Importing..." : "Start Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportContactModal;