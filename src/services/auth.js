import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const ROLES = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
};

export const login = async (username, password) => {
  const cleanInput = username.toLowerCase().replace(/\s/g, '');
  
  // 1. Check Admins
  if (cleanInput === 'admin' && password === '000000') {
    localStorage.setItem('userRole', ROLES.ADMIN);
    localStorage.removeItem('studentId'); 
    localStorage.removeItem('teacherId');
    return { success: true, role: ROLES.ADMIN };
  }

  try {
    // 2. Check Teachers (STRICT USERNAME/PASSWORD)
    const teachersRef = collection(db, 'teachers');
    const tQuery = query(teachersRef, where('username', '==', cleanInput), where('password', '==', password));
    const tSnap = await getDocs(tQuery);

    if (!tSnap.empty) {
      const teacherId = tSnap.docs[0].id;
      localStorage.setItem('userRole', ROLES.TEACHER);
      localStorage.setItem('teacherId', teacherId);
      return { success: true, role: ROLES.TEACHER, teacherId };
    }

    // 3. Check Students (STRICT USERNAME/PASSWORD)
    const studentsRef = collection(db, 'students');
    const sQuery = query(studentsRef, where('username', '==', cleanInput));
    const sSnap = await getDocs(sQuery);

    if (!sSnap.empty) {
      const student = sSnap.docs[0].data();
      const studentId = sSnap.docs[0].id;

      // Every student login (which parents also use) returns STUDENT role
      if (password === student.password) {
        localStorage.setItem('userRole', ROLES.STUDENT);
        localStorage.setItem('studentId', studentId);
        return { success: true, role: ROLES.STUDENT, studentId };
      }
    }

  } catch (err) {
    console.error("Auth Error:", err);
  }

  return { success: false };
};

export const isUsernameTaken = async (username, excludeId = null) => {
  const cleanInput = username.toLowerCase().replace(/\s/g, '');
  
  // Check Teachers
  const tQuery = query(collection(db, 'teachers'), where('username', '==', cleanInput));
  const tSnap = await getDocs(tQuery);
  const tTaken = tSnap.docs.some(doc => doc.id !== excludeId);
  if (tTaken) return true;

  // Check Students
  const sQuery = query(collection(db, 'students'), where('username', '==', cleanInput));
  const sSnap = await getDocs(sQuery);
  const sTaken = sSnap.docs.some(doc => doc.id !== excludeId);
  if (sTaken) return true;

  // Check Admin (reserved)
  if (cleanInput === 'admin') return true;

  return false;
};

export const logout = () => {
  localStorage.removeItem('userRole');
  localStorage.removeItem('studentId');
  localStorage.removeItem('teacherId');
  window.location.href = '/login';
};

export const getRole = () => localStorage.getItem('userRole');
export const getStudentId = () => localStorage.getItem('studentId');
export const getTeacherId = () => localStorage.getItem('teacherId');

export const isAuthenticated = () => !!getRole();
