import React, { useState, useEffect } from 'react';
import '../App.css';

function SharingPage() {
  const [file, setFile] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sharingEmails, setSharingEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);

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
      { id: 'user006', name: 'Vũ Văn F', email: 'vuvanf@company.com' },
      { id: 'user007', name: 'Phạm H', email: 'hpham@company.com' }
    ]
  };

  // Lấy danh sách users theo department đã chọn
  const availableUsers = selectedDepartment ? usersByDepartment[selectedDepartment] || [] : [];

  // Handle department selection
  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
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

  // Form submission - chỉ chia sẻ file
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Vui lòng chọn file');
      return;
    }

    if (selectedUsers.length === 0) {
      alert('Vui lòng chọn ít nhất một người dùng để chia sẻ');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('department', selectedDepartment);
      formData.append('sharingEmails', sharingEmails);
      formData.append('selectedUsers', JSON.stringify(selectedUsers));
      
      const userId = selectedUsers.length > 0 ? selectedUsers[0].id : 'default-user';
      formData.append('userId', userId);
      formData.append('mode', 'sharing'); // Chỉ chia sẻ

      const response = await fetch('/api/document/process', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProcessingId(data.processingId);
        setStatus({ status: 'processing', steps: { sharing: 'processing' } });
        startStatusPolling(data.processingId);
      } else {
        alert('Lỗi: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      alert('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Status polling - chỉ theo dõi sharing
  const startStatusPolling = (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/document/status/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const statusData = await response.json();
        setStatus(statusData);
        
        // Nếu sharing hoàn thành, hiển thị kết quả
        if (statusData.results?.sharing) {
          setResult(statusData.results.sharing);
          clearInterval(interval);
        }
        
        if (statusData.status === 'completed' || statusData.status === 'failed') {
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
    <div className="page-container">
      <div className="page-header">
        <h1>📤 Chia Sẻ Tài Liệu</h1>
        <p>Chia sẻ tài liệu với người dùng và quản lý quyền truy cập</p>
      </div>

      <div className="page-content">
        <div className="upload-section">
          <h2>📁 Upload Tài Liệu</h2>
          <form onSubmit={handleSubmit}>
            <div 
              className="file-upload"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <div className="upload-icon">📄</div>
              <div className="upload-text">
                {file ? `Đã chọn: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : 'Click để upload hoặc kéo thả file'}
              </div>
              <div className="upload-hint">Hỗ trợ: PDF, Word, Excel, PowerPoint, Images</div>
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
              <label htmlFor="sharingEmails">📧 Sharing Emails:</label>
              <textarea 
                id="sharingEmails" 
                value={sharingEmails}
                disabled
                className="disabled-input"
                rows="3"
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? '🔄 Đang chia sẻ...' : '🚀 Chia Sẻ Tài Liệu'}
            </button>
          </form>

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <div>Đang chia sẻ tài liệu...</div>
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="status-section">
          <h2>📊 Trạng Thái Chia Sẻ</h2>
          <div className="status-container">
            {status ? (
              <div className="status-item">
                <span className="status-text">Chia Sẻ Tài Liệu</span>
                <span className="status-icon">{getStatusIcon(status.steps?.sharing)}</span>
              </div>
            ) : (
              <div className="status-item pending">
                <span className="status-text">Chờ tài liệu...</span>
                <span className="status-icon">⏳</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="results-section">
            <h2>📋 Kết Quả Chia Sẻ</h2>
            <div className="results-container">
              <div className="result-card">
                <h3>📤 Kết Quả Chia Sẻ</h3>
                <div className="result-content">
                  <p><strong>Trạng thái:</strong> {result.status || 'Hoàn tất'}</p>
                  {status?.sharingEmails && status.sharingEmails.length > 0 && (
                    <p><strong>Đã chia sẻ với:</strong> {status.sharingEmails.join(', ')}</p>
                  )}
                  <p><strong>Mức độ truy cập:</strong> {result.accessLevel || 'Reader'}</p>
                  <p><strong>Hết hạn sau:</strong> {result.expirationDays || 30} ngày</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SharingPage;

