import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import GDPRPage from './pages/GDPRPage';
import SharingPage from './pages/SharingPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/gdpr" element={<GDPRPage />} />
          <Route path="/sharing" element={<SharingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;