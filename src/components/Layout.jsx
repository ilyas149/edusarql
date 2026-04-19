import React from 'react';
import { Outlet, Navigate, useLocation, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const { headerAction, headerTitle, backAction } = useHeader();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Determine if we are in an "immersive" view (detail page, chat, or when a specific modal is open via URL)
  // We check for pathnames like /chat AND for query parameters like ?studentId=... or ?modal=...
  const isSpecificViewActive = 
    location.pathname.includes('/chat') || 
    location.pathname.includes('/live') ||
    searchParams.has('studentId') ||
    searchParams.has('teacherId') ||
    searchParams.has('batchId') ||
    searchParams.get('modal') === 'true';

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const handleRefresh = async () => {
    // Since we use real-time listeners (onSnapshot), data is already synced.
    // We simulate a small delay to provide user feedback without triggering the browser's native progress bar.
    await new Promise(resolve => setTimeout(resolve, 1000));
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
        {!isSpecificViewActive && (
          <header className="content-header">
            <div className="header-left-side">
              {/* Mobile toggle hidden as per request */}
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
        )}

        <div className="page-container">
          <PullToRefresh onRefresh={handleRefresh}>
            <Outlet />
          </PullToRefresh>
        </div>
      </main>

      {!isSpecificViewActive && <BottomNav />}

      <style>{`
        @media (max-width: 768px) {
          .main-content {
            padding-bottom: ${isSpecificViewActive ? '0' : '68px'}; /* Space for bottom nav only if visible */
          }
          .page-container {
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
