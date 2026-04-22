import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getRole, ROLES, getStudentId, getTeacherId } from '../services/auth';
import {
  Users,
  UserSquare2,
  Layers,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  ShieldCheck,
  LogOut,
  Activity
} from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

import { useData } from '../context/DataContext';
import Footer from '../components/Footer';

const Dashboard = () => {
  const navigate = useNavigate();
  const role = getRole();
  const { students, teachers, batches } = useData();
  const studentId = getStudentId();
  const teacherId = getTeacherId();
  const [staffPresent, setStaffPresent] = React.useState(0);

  React.useEffect(() => {
    if (role !== ROLES.ADMIN) return;
    const today = new Date().toISOString().split('T')[0];
    const unsub = onSnapshot(doc(db, 'staff_attendance', today), (snap) => {
      if (snap.exists()) {
        const records = snap.data().records || {};
        const presentCount = Object.keys(records).filter(id => {
          return Object.values(records[id]).some(status => status === 'present');
        }).length;
        setStaffPresent(presentCount);
      } else {
        setStaffPresent(0);
      }
    });
    return () => unsub();
  }, [role]);

  const getUserName = () => {
    if (role === ROLES.STUDENT || role === ROLES.PARENT) {
      const student = students.find(s => s.id === studentId);
      return student ? student.name : role;
    }
    if (role === ROLES.TEACHER) {
      const teacher = teachers.find(t => t.id === teacherId);
      return teacher ? teacher.name : role;
    }
    return role;
  };

  const userName = getUserName();

  const stats = [
    { label: 'Students', count: students.length, color: '#3b82f6', icon: UserSquare2 },
    { label: 'Teachers', count: teachers.length, color: '#f43f5e', icon: Users },
    { label: 'Batches', count: batches.length, color: '#10b981', icon: Layers },
    ...(role === ROLES.ADMIN ? [{ label: 'Staff Present', count: `${staffPresent}/${teachers.length}`, color: '#8b5cf6', icon: Activity }] : [])
  ];

  const tabs = [
    { name: 'Teachers', icon: Users, path: '/dashboard/teachers', roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
    { name: 'Students', icon: UserSquare2, path: '/dashboard/students', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Batches', icon: Layers, path: '/dashboard/batches', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Attendance', icon: ClipboardCheck, path: '/dashboard/attendance', roles: [ROLES.ADMIN, ROLES.TEACHER] },
    { name: 'Timetable', icon: Calendar, path: '/dashboard/timetable', roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
    { name: 'Exams', icon: GraduationCap, path: '/dashboard/exams', roles: [ROLES.ADMIN, ROLES.TEACHER] },
  ];

  const filteredTabs = tabs.filter(tab => tab.roles.includes(role));

  return (
    <div className="dashboard-page">
      <div className="dashboard-header glass">
        <div className="welcome-banner">
          <div className="welcome-section">
            <div className="desktop-icon-box">
              <GraduationCap size={40} className="welcome-icon" />
            </div>
            <div className="mobile-logo-box">
              <img src="/img/logo.png" alt="Logo" className="dash-logo-mobile" />
            </div>
            <div className="welcome-text">
              <h1>Hello, {userName}</h1>
              <p>Welcome back to EduSarql institutional portal.</p>
              {role === ROLES.ADMIN && (
                <button 
                  className="admin-manage-btn"
                  onClick={() => navigate('/dashboard/admin-management')}
                >
                  <ShieldCheck size={14} />
                  <span>Admin Management</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="stats-row hide-mobile-stats">
            {stats.map(s => (
              <div key={s.label} className="stat-item">
                <div className="stat-icon-mini" style={{ color: s.color, background: `${s.color}15` }}>
                  <s.icon size={16} />
                </div>
                <div className="stat-data">
                  <span className="stat-count" style={{ color: s.color }}>{s.count}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="stats-row show-mobile-stats">
            {stats.map(s => (
              <div key={s.label} className="stat-item">
                <div className="stat-icon-mini" style={{ color: s.color, background: `${s.color}15` }}>
                  <s.icon size={14} />
                </div>
                <div className="stat-data">
                  <span className="stat-count" style={{ color: s.color }}>{s.count}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="quick-access-grid">
        {filteredTabs.map((tab) => (
          <div
            key={tab.path}
            className="tab-card"
            onClick={() => navigate(tab.path)}
          >
            <div className="tab-icon-wrapper">
              <tab.icon size={24} />
            </div>
            <span className="tab-label">{tab.name}</span>
          </div>
        ))}
      </div>

      {/* Mobile-only Logout (Previously had footer here) */}
      <div className="mobile-only-extras">
        <button className="mobile-logout-btn" onClick={() => logout()}>
          <LogOut size={20} />
          <span>Logout Account</span>
        </button>
      </div>

      {/* Global Dashboard Footer */}
      <div className="dashboard-footer-section">
        <Footer variant="dashboard" />
      </div>

      <style>{`
        .dashboard-page { 
          max-width: 1400px; 
          margin: 0 auto; 
          animation: fadeIn 0.4s ease-out; 
          padding: 16px; 
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 40px);
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .dashboard-header { margin-bottom: 24px; padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 8px 32px rgba(31, 38, 135, 0.03); }
        .welcome-banner { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        
        .welcome-section { display: flex; align-items: center; gap: 24px; }
        .desktop-icon-box { background: #eff6ff; padding: 12px; border-radius: 14px; color: var(--primary); display: flex; align-items: center; justify-content: center; }
        .mobile-logo-box { display: none; }
        
        .welcome-text h1 { font-size: 1.6rem; margin-bottom: 4px; text-transform: capitalize; color: #1e293b; font-weight: 800; }
        .welcome-text p { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        
        .stats-row { display: flex; gap: 16px; flex-wrap: wrap; }
        .show-mobile-stats { display: none; }
        .stat-item { background: var(--bg-card); padding: 16px 24px; border-radius: 12px; display: flex; align-items: center; gap: 16px; border: 1px solid var(--border); }
        .stat-icon-mini { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .stat-data { display: flex; flex-direction: column; }
        .stat-count { font-size: 1.5rem; font-weight: 800; line-height: 1.1; }
        .stat-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

        .quick-access-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
        .tab-card { background: white; border: 1.5px solid #f1f5f9; border-radius: 16px; padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; align-items: center; gap: 14px; position: relative; overflow: hidden; }
        .tab-card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(244, 63, 94, 0.15); }
        .tab-icon-wrapper { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 14px; color: #94a3b8; transition: all 0.25s; }
        .tab-card:hover .tab-icon-wrapper { background: #fff1f2; color: var(--primary); }
        .tab-label { font-size: 0.9rem; font-weight: 700; color: #334155; }
        
        @media (max-width: 768px) {
          .dashboard-header { padding: 24px 16px; }
          .welcome-banner { display: flex; flex-direction: column; align-items: center; gap: 24px; }
          .welcome-section { flex-direction: row; align-items: center; justify-content: center; gap: 16px; width: 100%; text-align: left; }
          .desktop-icon-box { display: none; }
          .mobile-logo-box { display: flex; background: white; width: 60px; height: 60px; padding: 10px; border-radius: 14px; box-shadow: 0 8px 20px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; flex-shrink: 0; }
          .dash-logo-mobile { width: 100%; height: 100%; object-fit: contain; }
          .welcome-text h1 { font-size: 1.25rem; letter-spacing: -0.5px; margin-bottom: 2px; }
          .welcome-text p { font-size: 0.75rem; line-height: 1.2; }
          .hide-mobile-stats { display: none; }
          .show-mobile-stats { display: flex; width: 100%; justify-content: flex-start; border-top: 1px solid #f1f5f9; padding-top: 16px; overflow-x: auto; padding-bottom: 8px; }
          .stat-item { padding: 12px 16px; gap: 12px; flex-shrink: 0; border-width: 1px; }
          .stat-icon-mini { width: 32px; height: 32px; }
          .stat-count { font-size: 1.2rem; }
          .stat-label { font-size: 0.7rem; }
          .admin-manage-btn { margin-top: 8px; }
        }


        .admin-manage-btn {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: white;
          border: 1.5px solid var(--primary);
          color: var(--primary);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          transition: 0.2s;
          cursor: pointer;
        }

        .admin-manage-btn:hover {
          background: var(--primary);
          color: white;
          transform: translateY(-1px);
        }

        .mobile-only-extras {
          display: none;
          margin-top: 40px;
          padding-bottom: 20px;
          flex-direction: column;
          gap: 24px;
        }

        @media (max-width: 768px) {
          .mobile-only-extras {
            display: flex;
          }
          .mobile-logout-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: #fff1f2;
            color: #e11d48;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
          }
          .dashboard-page {
            padding: 16px;
            padding-bottom: 0px;
            min-height: calc(100vh - 84px);
          }
        }

        .dashboard-footer-section {
          margin-top: auto;
          padding-top: 40px;
          border-top: 1px solid #f1f5f9;
          opacity: 0.8;
          padding-bottom: 24px;
        }

        @media (max-width: 768px) {
           .dashboard-footer-section {
             margin-top: auto;
             border-top: none;
             padding-top: 0;
             padding-bottom: 12px;
           }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
