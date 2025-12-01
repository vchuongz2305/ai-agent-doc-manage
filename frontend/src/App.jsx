import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sharingEmails, setSharingEmails] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Danh sách người dùng theo bộ phận
  const usersByDepartment = {
    'IT': [
      { id: 'user001', name: 'Nguyễn Văn A', email: 'nguyenvana@company.com' },
      { id: 'user002', name: 'Trần Văn B', email: 'tranvanb@company.com' }
    ],
    'HR': [
      { id: 'user003', name: 'Lê Thị C', email: 'lethic@company.com' },
      { id: 'user004', name: 'Phạm Văn D', email: 'phamvand@company.com' }
    ],
    'Finance': [
      { id: 'user005', name: 'Hoàng Thị E', email: 'hoangthie@company.com' },
      { id: 'user006', name: 'Vũ Văn F', email: 'vuvanf@company.com' }
    ]
  };

  // Lấy danh sách users theo department đã chọn
  const availableUsers = selectedDepartment ? usersByDepartment[selectedDepartment] || [] : [];

  // Handle department selection
  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
    // Don't reset selected users - allow multiple departments
  };

  // Add user to selected list
  const addUser = (user) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Add all users from current department
  const addAllUsersFromDepartment = () => {
    const newUsers = availableUsers.filter(user => 
      !selectedUsers.find(u => u.id === user.id)
    );
    setSelectedUsers([...selectedUsers, ...newUsers]);
  };

  // Remove user from selected list
  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  // Clear all selected users
  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  // Update sharing emails when selected users change
  useEffect(() => {
    const emails = selectedUsers.map(user => user.email).join(', ');
    setSharingEmails(emails);
  }, [selectedUsers]);

  // File upload handlers
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Please select a file');
      return;
    }

    setLoading(true);
    
    try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', selectedDepartment);
    formData.append('sharingEmails', sharingEmails);
    formData.append('selectedUsers', JSON.stringify(selectedUsers));
    
    // Get userId from first selected user, or use a default
    const userId = selectedUsers.length > 0 ? selectedUsers[0].id : 'default-user';
    formData.append('userId', userId);

      console.log('🚀 Sending request to:', '/api/document/process');
      console.log('📊 Form data:', {
        fileName: file.name,
        fileSize: file.size,
        userId: userId,
        department: selectedDepartment,
        sharingEmails: sharingEmails,
        selectedUsersCount: selectedUsers.length
      });

      const response = await fetch('/api/document/process', {
        method: 'POST',
        body: formData
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Response data:', result);
      
      if (result.success) {
        setProcessingId(result.processingId);
        setStatus({ status: 'processing', steps: { analysis: 'pending', gdpr: 'pending', sharing: 'pending' } });
        startStatusPolling(result.processingId);
        console.log('✅ Processing started with ID:', result.processingId);
      } else {
        console.error('❌ API Error:', result.message);
        alert('Error: ' + result.message);
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Status polling
  const startStatusPolling = (id) => {
    console.log('🔄 Starting status polling for ID:', id);
    const interval = setInterval(async () => {
      try {
        console.log('📡 Polling status for ID:', id);
        const response = await fetch(`/api/document/status/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const statusData = await response.json();
        console.log('📊 Status data:', statusData);
        setStatus(statusData);
        
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          console.log('🏁 Processing finished:', statusData.status);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('❌ Error fetching status:', error);
      }
    }, 2000);
  };

  const getStatusIcon = (stepStatus) => {
    switch (stepStatus) {
      case 'completed': return '✅';
      case 'processing': return '🔄';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '⏳';
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🤖 Document Management Agent</h1>
          <p>Intelligent document processing with GDPR compliance</p>
        </header>

        <div className="main-content">
          {/* Upload Section */}
          <div className="upload-section">
            <h2>📁 Upload Document</h2>
            <form onSubmit={handleSubmit}>
              <div 
                className="file-upload"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <div className="upload-icon">📄</div>
                <div className="upload-text">
                  {file ? `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Click to upload or drag & drop'}
                </div>
                <div className="upload-hint">Supports: PDF, Word, Excel, PowerPoint, Images</div>
                <input 
                  type="file" 
                  id="fileInput" 
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                  style={{ display: 'none' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="selectedDepartment">🏢 Chọn bộ phận:</label>
                <select 
                  id="selectedDepartment" 
                  value={selectedDepartment}
                  onChange={handleDepartmentChange}
                  required
                >
                  <option value="">-- Chọn bộ phận --</option>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              {selectedDepartment && (
                <div className="form-group">
                  <label>👥 Chọn người dùng từ bộ phận {selectedDepartment}:</label>
                  
                  <div className="department-actions">
                    <button
                      type="button"
                      onClick={addAllUsersFromDepartment}
                      className="add-all-btn"
                      disabled={availableUsers.every(user => 
                        selectedUsers.find(u => u.id === user.id)
                      )}
                    >
                      ✅ Chọn tất cả {selectedDepartment}
                    </button>
                  </div>

                  <div className="user-selection">
                    {availableUsers.map(user => (
                      <div key={user.id} className="user-option">
                        <button
                          type="button"
                          onClick={() => addUser(user)}
                          className="add-user-btn"
                          disabled={selectedUsers.find(u => u.id === user.id)}
                        >
                          ➕ {user.name}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedUsers.length > 0 && (
                <div className="form-group">
                  <div className="selected-users-header">
                    <label>📋 Danh sách người dùng đã chọn ({selectedUsers.length} người):</label>
                    <button
                      type="button"
                      onClick={clearAllUsers}
                      className="clear-all-btn"
                    >
                      🗑️ Xóa tất cả
                    </button>
                  </div>
                  
                  <div className="selected-users-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Bộ phận</th>
                          <th>ID</th>
                          <th>Tên</th>
                          <th>Email</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUsers.map(user => {
                          const userDepartment = Object.keys(usersByDepartment).find(dept => 
                            usersByDepartment[dept].find(u => u.id === user.id)
                          );
                          return (
                            <tr key={user.id}>
                              <td className="department-badge">{userDepartment}</td>
                              <td>{user.id}</td>
                              <td>{user.name}</td>
                              <td>{user.email}</td>
                              <td>
                              <button
                                type="button"
                                onClick={() => removeUser(user.id)}
                                className="remove-user-btn"
                                title="Xóa người dùng này"
                              >
                                🗑️ Xóa
                              </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="sharingEmails">📧 Sharing Emails (tự động):</label>
                <textarea 
                  id="sharingEmails" 
                  value={sharingEmails}
                  disabled
                  className="disabled-input"
                  rows="3"
                />
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? '🔄 Processing...' : '🚀 Process Document'}
              </button>
            </form>

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <div>Processing document...</div>
              </div>
            )}
          </div>

          {/* Status Section */}
          <div className="status-section">
            <h2>📊 Processing Status</h2>
            <div className="status-container">
              {status ? (
                <>
                  <div className="status-item">
                    <span className="status-text">Document Analysis</span>
                    <span className="status-icon">{getStatusIcon(status.steps?.analysis)}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-text">GDPR Compliance</span>
                    <span className="status-icon">{getStatusIcon(status.steps?.gdpr)}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-text">Document Sharing</span>
                    <span className="status-icon">{getStatusIcon(status.steps?.sharing)}</span>
                  </div>
                </>
              ) : (
                <div className="status-item pending">
                  <span className="status-text">Waiting for document...</span>
                  <span className="status-icon">⏳</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="results-section">
          <h2>📋 Processing Results</h2>
          <div className="results-container">
            {status?.results ? (
              <div className="results-grid">
                {status.results.analysis && (
                  <div className="result-card">
                    <h3>🔍 Document Analysis</h3>
                    <div className="result-content">
                      <p><strong>File:</strong> {status.fileName}</p>
                      <p><strong>Size:</strong> {(status.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                      <p><strong>Type:</strong> {status.mimeType}</p>
                      <p><strong>Analysis completed successfully</strong></p>
                    </div>
                  </div>
                )}

                {status.results.gdpr && (
                  <div className="result-card">
                    <h3>⚖️ GDPR Compliance</h3>
                    <div className="result-content">
                      <p><strong>Decision:</strong> {status.results.gdpr.gdprDecision || 'Unknown'}</p>
                      <p><strong>Personal Data Found:</strong> {status.results.gdpr.personalDataFound ? status.results.gdpr.personalDataFound.join(', ') : 'None'}</p>
                      <p><strong>Sensitive Data:</strong> {status.results.gdpr.sensitiveDataDetected ? 'Yes' : 'No'}</p>
                      <p><strong>DPO Notification:</strong> {status.results.gdpr.notifyDPO ? 'Required' : 'Not required'}</p>
                    </div>
                  </div>
                )}

                {status.results.sharing && (
                  <div className="result-card">
                    <h3>📤 Document Sharing</h3>
                    <div className="result-content">
                      <p><strong>Status:</strong> {status.results.sharing.status || 'Completed'}</p>
                      <p><strong>Shared with:</strong> {status.sharingEmails ? status.sharingEmails.join(', ') : 'No emails'}</p>
                      <p><strong>Access Level:</strong> {status.results.sharing.accessLevel || 'Reader'}</p>
                      <p><strong>Expiration:</strong> {status.results.sharing.expirationDays || 30} days</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="alert info">
                Upload a document to see processing results
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
  );
}

export default App;