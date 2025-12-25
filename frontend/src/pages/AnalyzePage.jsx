import React, { useState, useRef, useEffect } from 'react';
import AnalyzedFilesList from '../components/AnalyzedFilesList';
import FileDetailModal from '../components/FileDetailModal';
import '../App.css';

function AnalyzePage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const filesListRef = useRef(null);
  const pollingIntervalRef = useRef(null);

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

  // Form submission - chỉ gọi analyze
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Vui lòng chọn file');
      return;
    }

    setLoading(true);
    setIsAnalyzing(true);
    setResult(null);
    setStatus(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'analyze-user');
      formData.append('mode', 'analyze'); // Chỉ phân tích

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
        setStatus({ status: 'processing', steps: { analysis: 'processing' } });
        // Giữ loading state và bắt đầu polling
        startStatusPolling(data.processingId);
      } else {
        alert('Lỗi: ' + data.message);
        setLoading(false);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
      alert('Lỗi: ' + error.message);
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  // Status polling - chỉ theo dõi analysis
  const startStatusPolling = (id) => {
    let pollCount = 0;
    const maxPolls = 300; // Tối đa 10 phút (300 * 2s = 600s)
    
    // Clear interval cũ nếu có
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await fetch(`/api/document/status/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const statusData = await response.json();
        setStatus(statusData);
        
        // Kiểm tra nếu analysis đã hoàn thành (có kết quả)
        const hasAnalysisResult = statusData.results?.analysis && 
                                  statusData.steps?.analysis === 'completed';
        
        // Nếu analysis hoàn thành và có kết quả, dừng polling
        if (hasAnalysisResult) {
          setResult(statusData.results.analysis);
          setLoading(false);
          setIsAnalyzing(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          // Refresh danh sách file đã phân tích
          if (filesListRef.current) {
            filesListRef.current.refresh();
          }
          
          console.log('✅ Analysis completed, polling stopped');
          return;
        }
        
        // Nếu failed, dừng polling
        if (statusData.steps?.analysis === 'failed' || statusData.status === 'failed') {
          setLoading(false);
          setIsAnalyzing(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log('❌ Analysis failed, polling stopped');
          return;
        }
        
        // Timeout sau 10 phút
        if (pollCount >= maxPolls) {
          setLoading(false);
          setIsAnalyzing(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          alert('⏱️ Phân tích mất quá nhiều thời gian. Vui lòng thử lại.');
          console.warn('⚠️ Polling timeout after 10 minutes');
          return;
        }
        
        // Log progress mỗi 30 giây (15 polls)
        if (pollCount % 15 === 0) {
          console.log(`🔄 Still polling... (${pollCount * 2}s elapsed)`);
        }
      } catch (error) {
        console.error('❌ Error fetching status:', error);
        // Nếu lỗi liên tục, dừng polling sau 10 lần thử
        if (pollCount >= 10) {
          setLoading(false);
          setIsAnalyzing(false);
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          alert('❌ Không thể lấy trạng thái phân tích. Vui lòng thử lại.');
        }
      }
    }, 2000);
  };
  
  // Cleanup polling khi component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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
        <h1>🔍 Phân Tích Tài Liệu</h1>
        <p>Upload và phân tích tài liệu với AI</p>
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

            <button type="submit" className="btn" disabled={loading || isAnalyzing}>
              {loading || isAnalyzing ? '🔄 Đang phân tích...' : '🚀 Phân Tích Tài Liệu'}
            </button>
          </form>

          {(loading || isAnalyzing) && (
            <div className="loading">
              <div className="spinner"></div>
              <div>
                {isAnalyzing 
                  ? 'Đang chờ kết quả từ workflow...' 
                  : 'Đang gửi file lên server...'}
              </div>
              {isAnalyzing && status && (
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#718096' }}>
                  Trạng thái: {status.steps?.analysis === 'processing' ? 'Đang xử lý' : 
                               status.steps?.analysis === 'pending' ? 'Đang chờ' : 
                               status.steps?.analysis || 'Đang khởi tạo...'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="status-section">
          <h2>📊 Trạng Thái Phân Tích</h2>
          <div className="status-container">
            {status ? (
              <div className="status-item">
                <span className="status-text">Phân Tích Tài Liệu</span>
                <span className="status-icon">{getStatusIcon(status.steps?.analysis)}</span>
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
            <h2>📋 Kết Quả Phân Tích</h2>
            <div className="results-container">
              <div className="result-card">
                <h3>🔍 Kết Quả Phân Tích</h3>
                <div className="result-content">
                  {status?.fileName && <p><strong>File:</strong> {status.fileName}</p>}
                  {status?.fileSize && <p><strong>Kích thước:</strong> {(status.fileSize / 1024 / 1024).toFixed(2)} MB</p>}
                  {status?.mimeType && <p><strong>Loại:</strong> {status.mimeType}</p>}
                  <p><strong>Phân tích hoàn tất thành công</strong></p>
                  {result.summary && <p><strong>Tóm tắt:</strong> {result.summary}</p>}
                  {result.category && <p><strong>Danh mục:</strong> {result.category}</p>}
                </div>
              </div>

              {status?.docx_url && (
                <div className="result-card">
                  <h3>📄 Tài Liệu Phân Tích (DOCX)</h3>
                  <div className="result-content">
                    <p><strong>File:</strong> Tài liệu phân tích đã được tạo và lưu trên Cloudinary</p>
                    <a 
                      href={status.docx_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ marginTop: '10px', display: 'inline-block' }}
                    >
                      📥 Tải Xuống DOCX
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Danh sách file đã phân tích */}
      <div className="analyzed-files-wrapper">
        <AnalyzedFilesList ref={filesListRef} onFileSelect={setSelectedFile} />
      </div>

      {/* Modal xem chi tiết file */}
      {selectedFile && (
        <FileDetailModal 
          file={selectedFile} 
          onClose={() => setSelectedFile(null)} 
        />
      )}
    </div>
  );
}

export default AnalyzePage;

