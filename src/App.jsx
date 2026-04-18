import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Teachers from './pages/Teachers';
import Students from './pages/Students';
import Batches from './pages/Batches';
import Timetable from './pages/Timetable';
import Exams from './pages/Exams';
import Attendance from './pages/Attendance';
import StudentDetail from './pages/StudentDetail';
import TeacherDetail from './pages/TeacherDetail';
import Subjects from './pages/Subjects';
import Periods from './pages/Periods';
import ExamTypes from './pages/ExamTypes';
import AdminManagement from './pages/AdminManagement';
import { HeaderProvider } from './context/HeaderProvider';
import { DataProvider } from './context/DataProvider';
import { getRole, ROLES } from './services/auth';
import { NativeNavigationProvider } from './providers/NativeNavigationProvider';
import { useNativeBackNavigation } from './hooks/useNativeBackNavigation';
import { Toaster, toast } from 'react-hot-toast';
import './index.css';

const RoleRoute = ({ children, allowedRoles }) => {
  const role = getRole();
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const NavigationHandler = ({ children }) => {
  const { exitAttempt } = useNativeBackNavigation();
  
  React.useEffect(() => {
    if (exitAttempt) {
      toast('Press back again to exit', {
        id: 'exit-toast',
        icon: '👋',
        duration: 2000,
        position: 'bottom-center',
        style: {
          background: '#333',
          color: '#fff',
          borderRadius: '20px',
          fontSize: '14px',
          padding: '8px 16px'
        }
      });
    }
  }, [exitAttempt]);

  return children;
};

function App() {
  const primaryTabs = [
    '/dashboard',
    '/dashboard/students',
    '/dashboard/teachers',
    '/dashboard/attendance',
    '/dashboard/timetable',
    '/dashboard/exams',
    '/dashboard/batches'
  ];

  return (
    <HeaderProvider>
      <DataProvider>
        <Router>
          <NativeNavigationProvider primaryTabs={primaryTabs} defaultTab="/dashboard">
            <NavigationHandler>
              <Toaster position="bottom-center" />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  
                  {/* Admin & Teacher Access (Read-Only for Teacher) */}
                  <Route path="teachers" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.TEACHER]}><Teachers /></RoleRoute>} />
                  <Route path="teachers/:id" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.TEACHER]}><TeacherDetail /></RoleRoute>} />
                  <Route path="students" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.TEACHER]}><Students /></RoleRoute>} />
                  <Route path="batches" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.TEACHER]}><Batches /></RoleRoute>} />
                  <Route path="timetable" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.TEACHER]}><Timetable /></RoleRoute>} />
                  <Route path="exams" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.TEACHER]}><Exams /></RoleRoute>} />
                  <Route path="attendance" element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.TEACHER]}><Attendance /></RoleRoute>} />
                  <Route path="admin-management" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminManagement /></RoleRoute>} />
                  <Route path="subjects" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><Subjects /></RoleRoute>} />
                  <Route path="periods" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><Periods /></RoleRoute>} />
                  <Route path="exam-types" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><ExamTypes /></RoleRoute>} />

                  {/* Accessible to All (but Detail view has internal guard) */}
                  <Route path="students/:id" element={<StudentDetail />} />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </NavigationHandler>
          </NativeNavigationProvider>
        </Router>
      </DataProvider>
    </HeaderProvider>
  );
}

export default App;
