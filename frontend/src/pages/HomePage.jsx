import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

function HomePage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🤖 Document Management Agent</h1>
        <p>Hệ thống quản lý tài liệu thông minh với tuân thủ GDPR</p>
      </div>

      <div className="home-content">
        <div className="feature-cards">
          <Link to="/analyze" className="feature-card">
            <div className="feature-icon">🔍</div>
            <h2>Phân Tích Tài Liệu</h2>
            <p>Upload và phân tích tài liệu với AI để trích xuất thông tin, tóm tắt nội dung và phân loại tài liệu</p>
            <div className="feature-arrow">→</div>
          </Link>

          <Link to="/gdpr" className="feature-card">
            <div className="feature-icon">⚖️</div>
            <h2>Kiểm Tra GDPR</h2>
            <p>Kiểm tra tuân thủ GDPR, phát hiện dữ liệu cá nhân và đưa ra quyết định về việc xử lý tài liệu</p>
            <div className="feature-arrow">→</div>
          </Link>

          <Link to="/sharing" className="feature-card">
            <div className="feature-icon">📤</div>
            <h2>Chia Sẻ Tài Liệu</h2>
            <p>Chia sẻ tài liệu với người dùng, quản lý quyền truy cập và gửi thông báo tự động</p>
            <div className="feature-arrow">→</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

