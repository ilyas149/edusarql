import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import PullToRefresh from './PullToRefresh';
import { isAuthenticated } from '../services/auth';
import { useHeader } from '../hooks/useHeader';
import { Bell, Menu } from 'lucide-react';
import '../styles/Layout.css';
import '../styles/BottomNav.css';

const Layout = () => {
  const location = useLocation();
  const { headerAction, headerTitle, backAction } = useHeader();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const handleRefresh = async () => {
    // We just reload the window which is the standard PWA update check/manual sync
    window.location.reload();
  };

  const titles = {
    '/dashboard': 'Overview',
    '/dashboard/teachers': 'Teachers Directory',
    '/dashboard/students': 'Student Management',
    '/dashboard/batches': 'Batches & Groups',
    '/dashboard/timetable': 'Timetable',
    '/dashboard/exams': 'Exams & Marks',
    '/dashboard/attendance': 'Attendance Records',
  };

  const getTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard/students/')) return 'Student Profile';
    if (path.startsWith('/dashboard/teachers/')) return 'Teacher Profile';
    return titles[path] || 'EduSarql';
  };

  return (
    <div className={`layout-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}
      
      <main className="main-content">
        <header className="content-header">
          <div className="header-left-side">
            <button className="mobile-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            {backAction}
            <div className="header-title">
              <h1>{headerTitle || getTitle()}</h1>
            </div>
          </div>
          <div className="header-actions">
            {headerAction}
            <div className="notification-badge glass">
              <Bell size={16} />
            </div>
          </div>
        </header>

        <div className="page-container">
          <PullToRefresh onRefresh={handleRefresh}>
            <Outlet />
          </PullToRefresh>
        </div>
      </main>

      <BottomNav />

      <style>{`
        @media (max-width: 768px) {
          .main-content {
            padding-bottom: 68px; /* Space for bottom nav */
          }
          .page-container {
            padding: 12px 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
