import React, { useState } from 'react';
import '../App.css';

function GDPRPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);

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

  // Form submission - chỉ kiểm tra GDPR
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Vui lòng chọn file');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'gdpr-user');
      formData.append('mode', 'gdpr'); // Chỉ kiểm tra GDPR

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
        setStatus({ status: 'processing', steps: { gdpr: 'processing' } });
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

  // Status polling - chỉ theo dõi GDPR
  const startStatusPolling = (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/document/status/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const statusData = await response.json();
        setStatus(statusData);
        
        // Nếu GDPR check hoàn thành, hiển thị kết quả
        if (statusData.results?.gdpr) {
          setResult(statusData.results.gdpr);
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

  const getGDPRDecisionColor = (decision) => {
    switch (decision?.toLowerCase()) {
      case 'approve':
      case 'approved':
        return '#48bb78'; // green
      case 'delete':
      case 'reject':
        return '#f56565'; // red
      case 'review':
        return '#ed8936'; // orange
      default:
        return '#a0aec0'; // gray
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>⚖️ Kiểm Tra GDPR</h1>
        <p>Kiểm tra tuân thủ GDPR cho tài liệu</p>
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

            <button type="submit" className="btn" disabled={loading}>
              {loading ? '🔄 Đang kiểm tra...' : '🚀 Kiểm Tra GDPR'}
            </button>
          </form>

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <div>Đang kiểm tra tuân thủ GDPR...</div>
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="status-section">
          <h2>📊 Trạng Thái Kiểm Tra</h2>
          <div className="status-container">
            {status ? (
              <div className="status-item">
                <span className="status-text">Kiểm Tra GDPR</span>
                <span className="status-icon">{getStatusIcon(status.steps?.gdpr)}</span>
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
            <h2>📋 Kết Quả Kiểm Tra GDPR</h2>
            <div className="results-container">
              <div className="result-card" style={{ borderLeftColor: getGDPRDecisionColor(result.gdprDecision) }}>
                <h3>⚖️ Quyết Định GDPR</h3>
                <div className="result-content">
                  <p style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 'bold',
                    color: getGDPRDecisionColor(result.gdprDecision),
                    marginBottom: '15px'
                  }}>
                    {result.gdprDecision || 'Unknown'}
                  </p>
                  
                  {result.personalDataFound && result.personalDataFound.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      <p><strong>Dữ Liệu Cá Nhân Tìm Thấy:</strong></p>
                      <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                        {result.personalDataFound.map((data, index) => (
                          <li key={index}>{data}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <p><strong>Dữ Liệu Nhạy Cảm:</strong> {result.sensitiveDataDetected ? 'Có' : 'Không'}</p>
                  
                  <p><strong>Thông Báo DPO:</strong> {result.notifyDPO ? 'Bắt buộc' : 'Không bắt buộc'}</p>
                  
                  {result.reason && (
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                      <p><strong>Lý do:</strong></p>
                      <p>{result.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GDPRPage;

