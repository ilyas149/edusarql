import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRole, ROLES } from '../services/auth';
import {
  Users,
  UserSquare2,
  Layers,
  Calendar,
  ClipboardCheck,
  GraduationCap
} from 'lucide-react';

import { useData } from '../context/DataContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const role = getRole();
  const { students, teachers, batches } = useData();

  const stats = [
    { label: 'Students', count: students.length, color: '#3b82f6' },
    { label: 'Teachers', count: teachers.length, color: '#f43f5e' },
    { label: 'Batches', count: batches.length, color: '#10b981' },
  ];

  const tabs = [
    { name: 'Teachers', icon: Users, path: '/dashboard/teachers', roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
    { name: 'Students', icon: UserSquare2, path: '/dashboard/students', roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
    { name: 'Batches', icon: Layers, path: '/dashboard/batches', roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
    { name: 'Attendance', icon: ClipboardCheck, path: '/dashboard/attendance', roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
    { name: 'Timetable', icon: Calendar, path: '/dashboard/timetable', roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
    { name: 'Exams', icon: GraduationCap, path: '/dashboard/exams', roles: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT] },
  ];

  const filteredTabs = tabs.filter(tab => tab.roles.includes(role));

  return (
    <div className="dashboard-page">
      <div className="dashboard-header glass">
        <div className="welcome-banner">
          <div className="welcome-section">
            <div className="welcome-icon-box">
              <GraduationCap size={40} className="welcome-icon" />
            </div>
            <div>
              <h1>Hello, {role}</h1>
              <p>Welcome back to EduSarql institutional portal.</p>
            </div>
          </div>
          
          <div className="stats-row">
            {stats.map(s => (
              <div key={s.label} className="stat-item">
                <span className="stat-count" style={{ color: s.color }}>{s.count}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
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

      <style>{`
        .dashboard-page { max-width: 1400px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .dashboard-header { margin-bottom: 24px; padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.4); }
        .welcome-banner { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
        
        .welcome-section { display: flex; align-items: center; gap: 20px; }
        .welcome-icon-box { background: #eff6ff; padding: 12px; border-radius: 14px; color: var(--primary); display: flex; align-items: center; justify-content: center; }
        .welcome-section h1 { font-size: 1.5rem; margin-bottom: 4px; text-transform: capitalize; color: #1e293b; font-weight: 800; }
        .welcome-section p { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        
        .stats-row { display: flex; gap: 32px; padding: 0 12px; }
        .stat-item { display: flex; flex-direction: column; align-items: flex-end; }
        .stat-count { font-size: 1.8rem; font-weight: 900; line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }

        .quick-access-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
        .tab-card { background: white; border: 1.5px solid #f1f5f9; border-radius: 16px; padding: 28px 20px; text-align: center; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; align-items: center; gap: 14px; position: relative; overflow: hidden; }
        .tab-card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(244, 63, 94, 0.15); }
        .tab-icon-wrapper { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 14px; color: #94a3b8; transition: all 0.25s; }
        .tab-card:hover .tab-icon-wrapper { background: #fff1f2; color: var(--primary); }
        .tab-label { font-size: 0.9rem; font-weight: 700; color: #334155; }
        
        @media (max-width: 900px) {
          .welcome-banner { flex-direction: column; align-items: flex-start; gap: 24px; }
          .stats-row { width: 100%; justify-content: space-between; border-top: 1px solid #f1f5f9; pt: 20px; margin-top: 12px; }
          .stat-item { align-items: flex-start; }
        }
        @media (max-width: 480px) {
          .quick-access-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .dashboard-header { padding: 20px; }
          .welcome-section h1 { font-size: 1.2rem; }
          .stat-count { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
