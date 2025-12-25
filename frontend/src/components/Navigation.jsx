import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../App.css';

function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🤖 Document Agent
        </Link>
        <div className="nav-links">
          <Link to="/analyze" className={isActive('/analyze')}>
            🔍 Phân Tích
          </Link>
          <Link to="/gdpr" className={isActive('/gdpr')}>
            ⚖️ GDPR
          </Link>
          <Link to="/sharing" className={isActive('/sharing')}>
            📤 Chia Sẻ
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;

