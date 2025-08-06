import { useState, useRef, useEffect } from 'react';
import { X, Upload, File, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
// import './ImportModal.css';

export default function ImportModal({ onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState([]);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const fileInputRef = useRef(null);

  // Handle toast auto-dismiss after 3 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ ...toast, visible: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type) => {
    setToast({ message, type, visible: true });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // const handleFileSelection = (selectedFile) => {
  //   console.log('Selected file:', selectedFile?.name, selectedFile?.type);
  //   if (selectedFile && selectedFile.type === 'text/csv') {
  //     setFile(selectedFile);
  //     setErrors([]);
  //     parseCSVPreview(selectedFile);
  //   } else {
  //     setErrors(['Please select a valid CSV file']);
  //     setFile(null);
  //     setPreview([]);
  //     showToast('Invalid file type. Please select a CSV file.', 'error');
  //   }
  // };
const handleFileSelection = (selectedFile) => {
  console.log('Selected file:', selectedFile?.name, selectedFile?.type);

  // Define an array of accepted CSV MIME types
  const acceptedCsvTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel', // This is the one you're currently seeing
    'text/comma-separated-values',
    'application/x-csv',
    'text/x-csv'
  ];

  if (selectedFile && acceptedCsvTypes.includes(selectedFile.type)) {
    setFile(selectedFile);
    setErrors([]);
    parseCSVPreview(selectedFile);
  } else {
    setErrors(['Please select a valid CSV file']);
    setFile(null);
    setPreview([]);
    showToast('Invalid file type. Please select a CSV file.', 'error');
  }
};
  const parseCSVPreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        setErrors(['File is empty']);
        showToast('File is empty.', 'error');
        return;
      }

      const rows = lines.map(line => {
        const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
        return values;
      });

      const headers = rows[0];
      const dataRows = rows.slice(1, 6);

      const requiredHeaders = ['name', 'phone', 'email'];
      const headerLower = headers.map(h => h.toLowerCase());
      const missingHeaders = requiredHeaders.filter(req => 
        !headerLower.some(h => h.includes(req))
      );

      if (missingHeaders.length > 0) {
        setErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
        showToast(`Missing required columns: ${missingHeaders.join(', ')}`, 'error');
        return;
      }

      setPreview({
        headers,
        rows: dataRows,
        totalRows: rows.length - 1
      });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!file) {
      setErrors(['No file selected']);
      showToast('No file selected.', 'error');
      return;
    }

    setImporting(true);
    setErrors([]);
    console.log('Sending import request for file:', file.name, file.size);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/dnc/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Import response:', result);

      if (result.success) {
        if (result.duplicates && result.duplicates > 0) {
          showToast(`Imported ${result.totalImported} contacts, ${result.duplicates} duplicates ignored.`, 'warning');
        } else {
          showToast(`Successfully imported ${result.totalImported} contacts!`, 'success');
        }
        onImportSuccess(result.data);
        setTimeout(() => {
          window.location.reload();
        }, 3000); // Reload after toast disappears
      } else {
        setErrors(result.errors || [result.error || 'Failed to import contacts. Please try again.']);
        showToast('Failed to import contacts.', 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      setErrors(['Failed to import contacts: Network error. Please try again.']);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
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

        <div className="modal-header">
          <h2 className="modal-title">Import CSV File</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-content">
          <div 
            className={`upload-area ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => handleFileSelection(e.target.files[0])}
              style={{ display: 'none' }}
            />
            
            {file ? (
              <div className="file-selected">
                <File size={48} className="file-icon" />
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  className="change-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview([]);
                    setErrors([]);
                  }}
                >
                  Change File
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <Upload size={48} className="upload-icon" />
                <p className="upload-text">Drag and drop your CSV file here</p>
                <p className="upload-subtext">or click to browse files</p>
                <div className="file-requirements">
                  <p>Required columns: Name, Phone, Email</p>
                  <p>Maximum file size: 10MB</p>
                </div>
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div className="error-container">
              <AlertCircle size={16} className="error-icon" />
              <div className="error-messages">
                {errors.map((error, index) => (
                  <p key={index} className="error-message">{error}</p>
                ))}
              </div>
            </div>
          )}

          {preview.headers && (
            <div className="preview-container">
              <h3 className="preview-title">Preview ({preview.totalRows} contacts)</h3>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {preview.headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.totalRows > 5 && (
                <p className="preview-note">Showing first 5 rows of {preview.totalRows} total</p>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn"
            onClick={onClose} 
            disabled={importing}
          >
            Cancel
          </button>
          <button 
            className="import-btn"
            onClick={handleImport}
            disabled={!file || errors.length > 0 || importing}
          >
            {importing ? (
              <>
                <div className="spinner"></div>
                Importing...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Import Contacts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}