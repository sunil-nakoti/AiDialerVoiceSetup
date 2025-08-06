import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AgentModal({ agent, onClose, onSave }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  // If editing an existing agent, populate the form
  useEffect(() => {
    if (agent) {
      setFirstName(agent.firstName || '');
      setLastName(agent.lastName || '');
      setEmail(agent.email || '');
      setPassword(''); // Password is not pre-filled for security
    }
  }, [agent]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!agent && !password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave({
        firstName,
        lastName,
        email,
        password: password || undefined, // Only send password if provided
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="agent-modal">
        <div className="modal-header">
          <h2 className="modal-title">{agent ? 'Edit Agent' : 'Add New Agent'}</h2>
          <button className="close-button" onClick={onClose}>
            <X className="close-icon" />
          </button>
        </div>
        
        <div className="agent-form">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input 
              type="text" 
              className={`form-input ${errors.firstName ? 'error' : ''}`}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
            />
            {errors.firstName && <p className="error-message">{errors.firstName}</p>}
          </div>
          
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input 
              type="text" 
              className={`form-input ${errors.lastName ? 'error' : ''}`}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
            />
            {errors.lastName && <p className="error-message">{errors.lastName}</p>}
          </div>
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className={`form-input ${errors.email ? 'error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>
          
          <div className="form-group">
            <label className="form-label">Password {agent && '(Leave blank to keep unchanged)'}</label>
            <input 
              type="password" 
              className={`form-input ${errors.password ? 'error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={agent ? 'Enter new password (optional)' : 'Enter password'}
            />
            {errors.password && <p className="error-message">{errors.password}</p>}
          </div>
          
          <div className="modal-buttons">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button" onClick={handleSubmit}>
              {agent ? 'Update Agent' : 'Add Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}