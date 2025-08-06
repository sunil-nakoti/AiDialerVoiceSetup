import { useState } from 'react';
import APISettings from './APISettings';
import BuyNumbers from './BuyNumbers';
import "@/css/setting.css";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('API Settings');
  
  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };
  
  return (
    <div className="settings-container">
      <div className="breadcrumb">
        <a href="/" className="home-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="home-svg">
            <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
        <span className="separator"></span>
        <a href="/dashboard" className="breadcrumb-link">Dashboard</a>
        <span className="separator"></span>
        <span className="current-page">Settings</span>
      </div>  

      <h1 className="settings-title">Settings</h1>
      <p className="settings-subtitle">Configure your application settings</p>

      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'API Settings' ? 'active' : ''}`}
          onClick={() => handleTabClick('API Settings')}
        >
          API Settings
        </button>
        <button 
          className={`tab ${activeTab === 'Buy Numbers' ? 'active' : ''}`}
          onClick={() => handleTabClick('Buy Numbers')}
        >
          Buy Numbers
        </button>
      </div>

      {activeTab === 'API Settings' && <APISettings />}
      {activeTab === 'Buy Numbers' && <BuyNumbers />}
    </div>
  );
}