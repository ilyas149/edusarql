import React from 'react';
import { NavLink } from 'react-router-dom';
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
import '../styles/BottomNav.css';

const BottomNav = () => {
  const role = getRole();
  const studentId = getStudentId();

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

  return (
    <nav className="bottom-nav glass mobile-only">
      {links.map((item) => (
        <NavLink 
          key={item.path} 
          to={item.path}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          end={item.path === '/dashboard'}
        >
          <div className="nav-icon-wrapper">
             <item.icon size={26} strokeWidth={2.5} />
          </div>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
