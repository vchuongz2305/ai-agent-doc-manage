import React, { useState, useRef, useEffect } from 'react';
import '../App.css';

function GDPRPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const fileInputRef = useRef(null);

  // Mock data for testing UI
  const mockResults = {
    approve: {
      gdprDecision: 'approve',
      personalDataFound: [],
      sensitiveDataDetected: false,
      notifyDPO: false,
      reason: 'Tài liệu không chứa dữ liệu cá nhân hoặc thông tin nhạy cảm. Nội dung hoàn toàn tuân thủ quy định GDPR và có thể được xử lý an toàn.'
    },
    review: {
      gdprDecision: 'review',
      personalDataFound: ['Họ tên: Nguyễn Văn A', 'Email: example@email.com', 'Số điện thoại: 0901234567'],
      sensitiveDataDetected: false,
      notifyDPO: true,
      reason: 'Tài liệu chứa một số dữ liệu cá nhân cần được xem xét. Đề xuất kiểm tra mục đích sử dụng và đảm bảo có sự đồng ý của chủ thể dữ liệu trước khi xử lý.'
    },
    reject: {
      gdprDecision: 'reject',
      personalDataFound: ['CMND/CCCD: 012345678901', 'Địa chỉ nhà: 123 Đường ABC, Quận 1', 'Thông tin tài khoản ngân hàng', 'Thông tin y tế cá nhân'],
      sensitiveDataDetected: true,
      notifyDPO: true,
      reason: 'Tài liệu chứa dữ liệu nhạy cảm bao gồm thông tin y tế và tài chính cá nhân. Vi phạm nghiêm trọng quy định GDPR. Cần xóa hoặc ẩn danh hóa dữ liệu trước khi xử lý.'
    }
  };

  // Processing steps animation
  const processingSteps = [
    { icon: '📤', text: 'Tải lên tài liệu...' },
    { icon: '🔍', text: 'Quét nội dung...' },
    { icon: '🧠', text: 'Phân tích AI...' },
    { icon: '⚖️', text: 'Đánh giá GDPR...' },
    { icon: '✨', text: 'Hoàn tất!' }
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setProcessingStep(prev => (prev + 1) % 4);
      }, 800);
    } else {
      setProcessingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Show confetti on approve
  useEffect(() => {
    if (result?.gdprDecision?.toLowerCase() === 'approve') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [result]);

  // Test functions
  const simulateLoading = () => {
    setResult(null);
    setLoading(true);
    setProcessingStep(0);
    setStatus({ status: 'processing', steps: { gdpr: 'processing' } });
  };

  const simulateResult = (type) => {
    setLoading(false);
    setStatus({ status: 'completed', steps: { gdpr: 'completed' } });
    setResult(mockResults[type]);
  };

  const simulateFullProcess = (type) => {
    setResult(null);
    setLoading(true);
    setProcessingStep(0);
    setStatus({ status: 'processing', steps: { gdpr: 'processing' } });
    
    setTimeout(() => {
      setLoading(false);
      setStatus({ status: 'completed', steps: { gdpr: 'completed' } });
      setResult(mockResults[type]);
    }, 3000);
  };

  const resetTest = () => {
    setFile(null);
    setResult(null);
    setStatus(null);
    setLoading(false);
    setShowConfetti(false);
    setProcessingStep(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // File upload handlers
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form submission - chỉ kiểm tra GDPR
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Vui lòng chọn file');
      return;
    }

    // If test mode, simulate the process
    if (testMode) {
      const randomResults = ['approve', 'review', 'reject'];
      const randomType = randomResults[Math.floor(Math.random() * randomResults.length)];
      simulateFullProcess(randomType);
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

  const getGDPRDecisionInfo = (decision) => {
    switch (decision?.toLowerCase()) {
      case 'approve':
      case 'approved':
        return { 
          color: '#10b981', 
          bgColor: 'rgba(16, 185, 129, 0.1)',
          icon: '✅',
          label: 'PHÊ DUYỆT',
          description: 'Tài liệu tuân thủ GDPR'
        };
      case 'delete':
      case 'reject':
        return { 
          color: '#ef4444', 
          bgColor: 'rgba(239, 68, 68, 0.1)',
          icon: '🚫',
          label: 'TỪ CHỐI',
          description: 'Tài liệu vi phạm GDPR'
        };
      case 'review':
        return { 
          color: '#f59e0b', 
          bgColor: 'rgba(245, 158, 11, 0.1)',
          icon: '⚠️',
          label: 'CẦN XEM XÉT',
          description: 'Cần kiểm tra thêm'
        };
      default:
        return { 
          color: '#6b7280', 
          bgColor: 'rgba(107, 114, 128, 0.1)',
          icon: '❓',
          label: 'KHÔNG XÁC ĐỊNH',
          description: 'Chưa có kết quả'
        };
    }
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return '📄';
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return '📕';
      case 'doc':
      case 'docx': return '📘';
      case 'xls':
      case 'xlsx': return '📗';
      case 'ppt':
      case 'pptx': return '📙';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const decisionInfo = result ? getGDPRDecisionInfo(result.gdprDecision) : null;

  // Confetti component
  const Confetti = () => (
    <div className="gdpr-confetti-container">
      {[...Array(50)].map((_, i) => (
        <div 
          key={i} 
          className="gdpr-confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)]
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="gdpr-page-wrapper">
      {/* Animated Background */}
      <div className="gdpr-animated-bg">
        <div className="gdpr-bg-shape shape-1"></div>
        <div className="gdpr-bg-shape shape-2"></div>
        <div className="gdpr-bg-shape shape-3"></div>
        <div className="gdpr-bg-gradient"></div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && <Confetti />}

      <div className="page-container gdpr-container">
        {/* Hero Header */}
        <div className="gdpr-hero-header">
          <div className="gdpr-hero-icon">
            <div className="gdpr-shield-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className="gdpr-hero-glow"></div>
          </div>
          <h1 className="gdpr-hero-title">Kiểm Tra GDPR</h1>
          <p className="gdpr-hero-subtitle">
            Phân tích AI thông minh • Đánh giá tuân thủ tự động • Bảo vệ dữ liệu cá nhân
          </p>
        </div>

      {/* Test Controls Panel */}
      {testMode && (
        <div className="gdpr-test-panel">
          <div className="gdpr-test-header">
            <span className="gdpr-test-badge">🧪 CHẾ ĐỘ TEST</span>
            <label className="gdpr-test-toggle">
              <input 
                type="checkbox" 
                checked={testMode} 
                onChange={(e) => setTestMode(e.target.checked)}
              />
              <span className="gdpr-toggle-slider"></span>
              <span className="gdpr-toggle-label">Test Mode</span>
            </label>
          </div>
          
          <div className="gdpr-test-section">
            <h4>🎯 Test Kết Quả Trực Tiếp</h4>
            <div className="gdpr-test-buttons">
              <button 
                className="gdpr-test-btn approve"
                onClick={() => simulateResult('approve')}
              >
                ✅ PHÊ DUYỆT
              </button>
              <button 
                className="gdpr-test-btn review"
                onClick={() => simulateResult('review')}
              >
                ⚠️ CẦN XEM XÉT
              </button>
              <button 
                className="gdpr-test-btn reject"
                onClick={() => simulateResult('reject')}
              >
                🚫 TỪ CHỐI
              </button>
            </div>
          </div>

          <div className="gdpr-test-section">
            <h4>⏳ Test Với Animation Loading</h4>
            <div className="gdpr-test-buttons">
              <button 
                className="gdpr-test-btn loading-btn"
                onClick={simulateLoading}
                disabled={loading}
              >
                🔄 Bắt Đầu Loading
              </button>
              <button 
                className="gdpr-test-btn process-btn"
                onClick={() => simulateFullProcess('approve')}
                disabled={loading}
              >
                ▶️ Full Process (Approve)
              </button>
              <button 
                className="gdpr-test-btn process-btn"
                onClick={() => simulateFullProcess('review')}
                disabled={loading}
              >
                ▶️ Full Process (Review)
              </button>
              <button 
                className="gdpr-test-btn process-btn"
                onClick={() => simulateFullProcess('reject')}
                disabled={loading}
              >
                ▶️ Full Process (Reject)
              </button>
            </div>
          </div>

          <div className="gdpr-test-section">
            <h4>🔧 Điều Khiển</h4>
            <div className="gdpr-test-buttons">
              <button 
                className="gdpr-test-btn reset-btn"
                onClick={resetTest}
              >
                🔄 Reset Tất Cả
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="gdpr-main-content">
        {/* Upload Section */}
        <div className="gdpr-upload-card gdpr-glass-card">
          <div className="gdpr-card-shine"></div>
          <div className="gdpr-card-header">
            <div className="gdpr-card-icon-wrapper">
              <span className="gdpr-card-icon">📤</span>
            </div>
            <div>
              <h2>Tải Lên Tài Liệu</h2>
              <span className="gdpr-card-subtitle">Chọn file để kiểm tra GDPR</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div 
              className={`gdpr-dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="gdpr-dropzone-bg"></div>
              {!file ? (
                <>
                  <div className="gdpr-dropzone-icon">
                    <div className="gdpr-upload-circle">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                  </div>
                  <div className="gdpr-dropzone-text">
                    <span className="gdpr-dropzone-title">Kéo thả file vào đây</span>
                    <span className="gdpr-dropzone-subtitle">hoặc click để chọn file</span>
                  </div>
                  <div className="gdpr-dropzone-formats">
                    <span className="gdpr-format-tag"><i>📄</i> PDF</span>
                    <span className="gdpr-format-tag"><i>📝</i> Word</span>
                    <span className="gdpr-format-tag"><i>📊</i> Excel</span>
                    <span className="gdpr-format-tag"><i>📽️</i> PPT</span>
                    <span className="gdpr-format-tag"><i>🖼️</i> Images</span>
                  </div>
                </>
              ) : (
                <div className="gdpr-file-preview">
                  <div className="gdpr-file-icon-large">{getFileIcon(file.name)}</div>
                  <div className="gdpr-file-info">
                    <span className="gdpr-file-name">{file.name}</span>
                    <span className="gdpr-file-size">{formatFileSize(file.size)}</span>
                    <span className="gdpr-file-ready">✓ Sẵn sàng kiểm tra</span>
                  </div>
                  <button 
                    type="button" 
                    className="gdpr-file-remove"
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                style={{ display: 'none' }}
              />
            </div>

            <button 
              type="submit" 
              className={`gdpr-submit-btn ${loading ? 'loading' : ''} ${file ? 'ready' : ''}`}
              disabled={loading || !file}
            >
              <span className="gdpr-btn-bg"></span>
              {loading ? (
                <>
                  <span className="gdpr-btn-spinner"></span>
                  <span className="gdpr-btn-text">Đang phân tích...</span>
                </>
              ) : (
                <>
                  <span className="gdpr-btn-icon">🔍</span>
                  <span className="gdpr-btn-text">Kiểm Tra GDPR</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Status Section */}
        <div className="gdpr-status-card gdpr-glass-card">
          <div className="gdpr-card-shine"></div>
          <div className="gdpr-card-header">
            <div className="gdpr-card-icon-wrapper">
              <span className="gdpr-card-icon">📊</span>
            </div>
            <div>
              <h2>Trạng Thái Xử Lý</h2>
              <span className="gdpr-card-subtitle">Theo dõi tiến trình phân tích</span>
            </div>
          </div>
          
          <div className="gdpr-status-content">
            {loading || status ? (
              <div className="gdpr-progress-container">
                {/* Multi-step Progress */}
                <div className="gdpr-steps-timeline">
                  {processingSteps.map((step, index) => (
                    <div 
                      key={index}
                      className={`gdpr-timeline-step ${
                        status?.steps?.gdpr === 'completed' ? 'completed' :
                        index < processingStep ? 'completed' : 
                        index === processingStep && loading ? 'active' : ''
                      }`}
                    >
                      <div className="gdpr-timeline-dot">
                        {status?.steps?.gdpr === 'completed' || index < processingStep ? '✓' : 
                         index === processingStep && loading ? <span className="gdpr-mini-spinner"></span> : 
                         (index + 1)}
                      </div>
                      <div className="gdpr-timeline-content">
                        <span className="gdpr-timeline-icon">{step.icon}</span>
                        <span className="gdpr-timeline-text">{step.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="gdpr-progress-bar-wrapper">
                  <div className="gdpr-progress-bar">
                    <div 
                      className={`gdpr-progress-fill ${status?.steps?.gdpr === 'completed' ? 'complete' : ''}`}
                      style={{
                        width: status?.steps?.gdpr === 'completed' ? '100%' : `${(processingStep + 1) * 25}%`
                      }}
                    ></div>
                  </div>
                  <span className="gdpr-progress-percent">
                    {status?.steps?.gdpr === 'completed' ? '100' : (processingStep + 1) * 25}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="gdpr-status-empty">
                <div className="gdpr-empty-illustration">
                  <div className="gdpr-empty-circle"></div>
                  <div className="gdpr-empty-icon">📋</div>
                </div>
                <p>Chưa có tài liệu nào được kiểm tra</p>
                <span>Upload tài liệu để bắt đầu phân tích GDPR</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className={`gdpr-results-section ${result.gdprDecision}`}>
          <div className="gdpr-results-header">
            <div className="gdpr-results-title-wrapper">
              <span className="gdpr-results-icon">📋</span>
              <h2>Kết Quả Phân Tích GDPR</h2>
            </div>
          </div>
          
          <div className="gdpr-results-grid">
            {/* Main Decision Card */}
            <div 
              className={`gdpr-decision-card gdpr-decision-${result.gdprDecision}`}
              style={{ 
                borderColor: decisionInfo.color,
              }}
            >
              <div className="gdpr-decision-glow" style={{ background: decisionInfo.color }}></div>
              <div className="gdpr-decision-content">
                <div className="gdpr-decision-badge" style={{ backgroundColor: decisionInfo.color }}>
                  <span className="gdpr-decision-icon">{decisionInfo.icon}</span>
                  <span className="gdpr-decision-label">{decisionInfo.label}</span>
                </div>
                <p className="gdpr-decision-desc">{decisionInfo.description}</p>
                <div className="gdpr-decision-meter">
                  <div className="gdpr-meter-track">
                    <div 
                      className="gdpr-meter-fill"
                      style={{ 
                        width: result.gdprDecision === 'approve' ? '100%' : 
                               result.gdprDecision === 'review' ? '60%' : '20%',
                        background: decisionInfo.color
                      }}
                    ></div>
                  </div>
                  <span className="gdpr-meter-label">Mức độ tuân thủ</span>
                </div>
              </div>
            </div>

            {/* Personal Data Card */}
            <div className="gdpr-info-card gdpr-glass-card">
              <div className="gdpr-card-shine"></div>
              <div className="gdpr-info-header">
                <div className="gdpr-info-icon-wrapper personal">
                  <span className="gdpr-info-icon">👤</span>
                </div>
                <h3>Dữ Liệu Cá Nhân</h3>
                {result.personalDataFound?.length > 0 && (
                  <span className="gdpr-info-count">{result.personalDataFound.length}</span>
                )}
              </div>
              <div className="gdpr-info-content">
                {result.personalDataFound && result.personalDataFound.length > 0 ? (
                  <ul className="gdpr-data-list">
                    {result.personalDataFound.map((data, index) => (
                      <li key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                        <span className="gdpr-data-icon">🔹</span>
                        <span className="gdpr-data-text">{data}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="gdpr-no-data">
                    <span className="gdpr-check-icon">✓</span>
                    <p>Không tìm thấy dữ liệu cá nhân</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sensitive Data Card */}
            <div className="gdpr-info-card gdpr-glass-card">
              <div className="gdpr-card-shine"></div>
              <div className="gdpr-info-header">
                <div className={`gdpr-info-icon-wrapper ${result.sensitiveDataDetected ? 'warning' : 'success'}`}>
                  <span className="gdpr-info-icon">🔐</span>
                </div>
                <h3>Dữ Liệu Nhạy Cảm</h3>
              </div>
              <div className="gdpr-info-content">
                <div className={`gdpr-status-indicator ${result.sensitiveDataDetected ? 'warning' : 'success'}`}>
                  <div className="gdpr-indicator-icon">
                    {result.sensitiveDataDetected ? '⚠️' : '✅'}
                  </div>
                  <div className="gdpr-indicator-text">
                    <span className="gdpr-indicator-title">
                      {result.sensitiveDataDetected ? 'Có phát hiện' : 'An toàn'}
                    </span>
                    <span className="gdpr-indicator-desc">
                      {result.sensitiveDataDetected ? 'Cần xử lý ngay' : 'Không có rủi ro'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DPO Notification Card */}
            <div className="gdpr-info-card gdpr-glass-card">
              <div className="gdpr-card-shine"></div>
              <div className="gdpr-info-header">
                <div className={`gdpr-info-icon-wrapper ${result.notifyDPO ? 'warning' : 'success'}`}>
                  <span className="gdpr-info-icon">📧</span>
                </div>
                <h3>Thông Báo DPO</h3>
              </div>
              <div className="gdpr-info-content">
                <div className={`gdpr-status-indicator ${result.notifyDPO ? 'warning' : 'success'}`}>
                  <div className="gdpr-indicator-icon">
                    {result.notifyDPO ? '📬' : '📭'}
                  </div>
                  <div className="gdpr-indicator-text">
                    <span className="gdpr-indicator-title">
                      {result.notifyDPO ? 'Bắt buộc' : 'Không bắt buộc'}
                    </span>
                    <span className="gdpr-indicator-desc">
                      {result.notifyDPO ? 'Thông báo DPO ngay' : 'Không cần thông báo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason Card */}
            {result.reason && (
              <div className="gdpr-reason-card gdpr-glass-card">
                <div className="gdpr-card-shine"></div>
                <div className="gdpr-info-header">
                  <div className="gdpr-info-icon-wrapper reason">
                    <span className="gdpr-info-icon">💡</span>
                  </div>
                  <h3>Phân Tích Chi Tiết</h3>
                </div>
                <div className="gdpr-reason-content">
                  <div className="gdpr-reason-quote">
                    <svg className="gdpr-quote-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                    </svg>
                    <p>{result.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="gdpr-action-buttons">
            <button className="gdpr-action-btn secondary" onClick={resetTest}>
              <span>🔄</span> Kiểm tra file khác
            </button>
            <button className="gdpr-action-btn primary">
              <span>📥</span> Tải báo cáo PDF
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default GDPRPage;

