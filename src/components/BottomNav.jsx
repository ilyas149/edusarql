import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Users, 
  UserSquare2, 
  Layers, 
  Calendar, 
  ClipboardCheck, 
  LayoutDashboard,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { getRole, ROLES, getStudentId } from '../services/auth';
import { useNativeBackNavigation } from '../hooks/useNativeBackNavigation';
import '../styles/BottomNav.css';

const BottomNav = () => {
  const role = getRole();
  const studentId = getStudentId();
  const location = useLocation();
  const { switchTab } = useNativeBackNavigation();

  const adminTeacherLinks = [
    { name: 'Home', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Students', icon: UserSquare2, path: '/dashboard/students' },
    { name: 'Attend', icon: ClipboardCheck, path: '/dashboard/attendance' },
    { name: 'Time', icon: Calendar, path: '/dashboard/timetable' },
    { name: 'Exams', icon: GraduationCap, path: '/dashboard/exams' },
  ];

  const studentLinks = [
    { name: 'Home', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Report', icon: UserSquare2, path: `/dashboard/students/${studentId}` },
    { name: 'Time', icon: Calendar, path: '/dashboard/timetable' },
  ];

  const links = role === ROLES.STUDENT || role === ROLES.PARENT ? studentLinks : adminTeacherLinks;

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav glass mobile-only">
      {links.map((item) => (
        <div 
          key={item.path} 
          onClick={() => switchTab(item.path)}
          className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          <div className="nav-icon-wrapper">
             <item.icon size={24} strokeWidth={2.5} />
          </div>
        </div>
      ))}
    </nav>
  );
};

export default BottomNav;
