import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import '../App.css';

const AnalyzedFilesList = forwardRef(({ onFileSelect }, ref) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalyzedFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/document/status');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const allStatus = await response.json();
      
      // Lọc chỉ những file đã có kết quả phân tích
      const analyzedFiles = allStatus.filter(status => 
        status.results?.analysis && 
        status.status === 'completed'
      );
      
      // Sắp xếp theo thời gian tạo (mới nhất trước)
      analyzedFiles.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setFiles(analyzedFiles);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading analyzed files:', err);
      setError('Không thể tải danh sách file đã phân tích');
    } finally {
      setLoading(false);
    }
  };

  // Expose loadAnalyzedFiles method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: loadAnalyzedFiles
  }));

  useEffect(() => {
    loadAnalyzedFiles();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="analyzed-files-section">
        <h2>📚 Tài Liệu Đã Phân Tích</h2>
        <div className="loading">
          <div className="spinner"></div>
          <div>Đang tải danh sách...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analyzed-files-section">
        <h2>📚 Tài Liệu Đã Phân Tích</h2>
        <div className="alert error">
          {error}
          <button onClick={loadAnalyzedFiles} className="retry-btn" style={{ marginTop: '10px' }}>
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analyzed-files-section">
      <div className="section-header">
        <h2>📚 Tài Liệu Đã Phân Tích</h2>
        <button onClick={loadAnalyzedFiles} className="refresh-btn" title="Làm mới danh sách">
          🔄
        </button>
      </div>
      
      {files.length === 0 ? (
        <div className="alert info">
          Chưa có tài liệu nào được phân tích. Hãy upload và phân tích tài liệu đầu tiên!
        </div>
      ) : (
        <div className="files-list">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="file-item"
              onClick={() => onFileSelect && onFileSelect(file)}
            >
              <div className="file-item-header">
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <h3 className="file-name">{file.fileName || 'Unknown'}</h3>
                  <div className="file-meta">
                    <span className="file-size">{formatFileSize(file.fileSize)}</span>
                    <span className="file-separator">•</span>
                    <span className="file-date">{formatDate(file.createdAt)}</span>
                  </div>
                </div>
                <div className="file-actions">
                  {file.docx_url && (
                    <a 
                      href={file.docx_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="download-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="Tải xuống DOCX"
                    >
                      📥
                    </a>
                  )}
                  <button 
                    className="view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileSelect && onFileSelect(file);
                    }}
                    title="Xem chi tiết"
                  >
                    👁️
                  </button>
                </div>
              </div>
              
              {file.results?.analysis && (
                <div className="file-preview">
                  {file.results.analysis.summary && (
                    <p className="file-summary">
                      <strong>Tóm tắt:</strong> {file.results.analysis.summary.substring(0, 150)}
                      {file.results.analysis.summary.length > 150 ? '...' : ''}
                    </p>
                  )}
                  {file.results.analysis.category && (
                    <span className="file-category">{file.results.analysis.category}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

AnalyzedFilesList.displayName = 'AnalyzedFilesList';

export default AnalyzedFilesList;

