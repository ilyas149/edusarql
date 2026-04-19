import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, 
  UserSquare2, 
  Layers, 
  Calendar, 
  ClipboardCheck, 
  LogOut,
  LayoutDashboard,
  BookOpen,
  Clock,
  ShieldCheck,
  GraduationCap,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { logout, getRole, ROLES, getStudentId } from '../services/auth';
import '../styles/Sidebar.css';

import Footer from './Footer';

const Sidebar = ({ isOpen, onClose }) => {
  const role = getRole();
  const studentId = getStudentId();

  const primarySection = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Teachers', icon: Users, path: '/dashboard/teachers', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Students', icon: UserSquare2, path: '/dashboard/students', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Batches', icon: Layers, path: '/dashboard/batches', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Attendance', icon: ClipboardCheck, path: '/dashboard/attendance', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Timetable', icon: Calendar, path: '/dashboard/timetable', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Exams & Marks', icon: GraduationCap, path: '/dashboard/exams', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    // Scoped Record Link for Students/Parents
    { name: 'My Performance', icon: UserSquare2, path: `/dashboard/students/${studentId}`, roles: [ROLES.STUDENT, ROLES.PARENT] },
  ];

  const filter = (items) => items.filter(item => item.roles.includes(role));

  return (
    <div className={`sidebar glass ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img src="/img/logo.png" alt="Logo" className="logo-img" />
        <h2>EduSarql</h2>
      </div>

      <div className="user-info">
        <div className="user-meta">
          <div className="avatar-small">
            {role?.charAt(0)}
          </div>
          <div className="user-details">
            <p className="role-label">{role}</p>
            <p className="status-online">Online</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Academic</div>
        {filter(primarySection).map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
            end
          >
            <item.icon size={18} />
            <span>{item.name}</span>
          </NavLink>
        ))}

        {role === ROLES.ADMIN && (
          <>
            <NavLink 
              to="/dashboard/admin-management"
              className={({ isActive }) => `nav-item admin-nav ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <ShieldCheck size={18} />
              <span>Admin Management</span>
            </NavLink>
          </>
        )}
      </nav>
      <div className="sidebar-footer-new">
        <button onClick={() => { logout(); onClose(); }} className="sidebar-logout-btn">
          <LogOut size={18} />
          <span>Logout Account</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
