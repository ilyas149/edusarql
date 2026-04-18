import React, { useState } from 'react';
import Subjects from './Subjects';
import Periods from './Periods';
import ExamTypes from './ExamTypes';
import { BookOpen, Clock, ShieldCheck, Settings } from 'lucide-react';


const AdminManagement = () => {
  const [activeTab, setActiveTab] = useState('subjects');


  const tabs = [
    { id: 'subjects', label: 'Subjects', icon: BookOpen, component: <Subjects /> },
    { id: 'periods', label: 'Time Periods', icon: Clock, component: <Periods /> },
    { id: 'exam-types', label: 'Exam Categories', icon: ShieldCheck, component: <ExamTypes /> },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab).component;

  return (
    <div className="admin-manage-page">
      <div className="admin-header-strip">
         <div className="tabs-container glass">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
         </div>
      </div>

      <div className="tab-content-area">
         {ActiveComponent}
      </div>

      <style>{`
        .admin-manage-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .admin-header-strip {
          background: white;
          padding: 6px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          position: sticky;
          top: 0; 
          z-index: 100;
          margin-bottom: 20px;
        }

        .tabs-container {
          display: flex;
          gap: 6px;
          width: 100%;
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-dim);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          background: transparent;
          white-space: nowrap;
        }

        .tab-btn:hover {
          background: #f1f5f9;
          color: var(--text-main);
        }

        .tab-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
        }

        .tab-content-area {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .tab-btn span {
            display: none;
          }
          .tab-btn {
            padding: 10px;
          }
          .admin-header-strip {
             margin-bottom: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminManagement;
