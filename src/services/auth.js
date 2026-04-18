import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const ROLES = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
};

const PASSWORDS = {
  [ROLES.ADMIN]: '000000',
  [ROLES.TEACHER]: '121212',
  [ROLES.STUDENT]: '111111',
  [ROLES.PARENT]: '222222',
};

export const login = async (username, password) => {
  const cleanInput = username.toLowerCase().replace(/\s/g, '');
  
  // 1. Check Static Roles (Admin/Teacher) - These use global passwords
  const STATIC_MAP = {
    'admin': ROLES.ADMIN,
    'teacher': ROLES.TEACHER
  };

  if (STATIC_MAP[cleanInput]) {
    const role = STATIC_MAP[cleanInput];
    if (PASSWORDS[role] === password) {
      localStorage.setItem('userRole', role);
      localStorage.removeItem('studentId'); 
      return { success: true, role };
    }
  }

  // 2. Check Dynamic Identities (Teacher/Student/Parent)
  try {
    // Check Teachers Collection using username OR searchName query
    const teachersRef = collection(db, 'teachers');
    
    // Try explicit username first
    let tQuery = query(teachersRef, where('username', '==', cleanInput));
    let tSnap = await getDocs(tQuery);

    // Try searchName if username query is empty
    if (tSnap.empty) {
      tQuery = query(teachersRef, where('searchName', '==', cleanInput));
      tSnap = await getDocs(tQuery);
    }

    if (!tSnap.empty) {
      const teacher = tSnap.docs[0].data();
      const teacherId = tSnap.docs[0].id;
      const validPassword = teacher.password || PASSWORDS[ROLES.TEACHER];
      
      if (password === validPassword) {
        localStorage.setItem('userRole', ROLES.TEACHER);
        localStorage.setItem('teacherId', teacherId);
        return { success: true, role: ROLES.TEACHER, teacherId };
      }
    }

    // Legacy Support for old teachers (fetch all)
    if (tSnap.empty) {
      const allTeachersSnap = await getDocs(teachersRef);
      const legacyTeacher = allTeachersSnap.docs.find(doc => {
        const data = doc.data();
        const ident = (data.username || data.name || "").toLowerCase().replace(/\s/g, '');
        return ident === cleanInput;
      });
      if (legacyTeacher) {
        const data = legacyTeacher.data();
        if (password === (data.password || PASSWORDS[ROLES.TEACHER])) {
          localStorage.setItem('userRole', ROLES.TEACHER);
          localStorage.setItem('teacherId', legacyTeacher.id);
          return { success: true, role: ROLES.TEACHER, teacherId: legacyTeacher.id };
        }
      }
    }

    // Check Students Collection using username OR searchName query
    const studentsRef = collection(db, 'students');
    
    // Try explicit username first
    let sQuery = query(studentsRef, where('username', '==', cleanInput));
    let sSnap = await getDocs(sQuery);

    // Try searchName if username query is empty
    if (sSnap.empty) {
      sQuery = query(studentsRef, where('searchName', '==', cleanInput));
      sSnap = await getDocs(sQuery);
    }

    if (!sSnap.empty) {
      const student = sSnap.docs[0].data();
      const studentId = sSnap.docs[0].id;
      let authenticatedRole = null;

      if (password === (student.password || PASSWORDS[ROLES.STUDENT])) {
        authenticatedRole = ROLES.STUDENT;
      } else if (password === PASSWORDS[ROLES.PARENT]) {
        authenticatedRole = ROLES.PARENT;
      }

      if (authenticatedRole) {
        localStorage.setItem('userRole', authenticatedRole);
        localStorage.setItem('studentId', studentId);
        return { success: true, role: authenticatedRole, studentId };
      }
    }

    // Legacy Support for old students
    if (sSnap.empty) {
      const allStudentsSnap = await getDocs(studentsRef);
      const legacyStudent = allStudentsSnap.docs.find(doc => {
        const data = doc.data();
        const ident = (data.username || data.name || "").toLowerCase().replace(/\s/g, '');
        return ident === cleanInput;
      });
      if (legacyStudent) {
        const data = legacyStudent.data();
        let role = null;
        if (password === (data.password || PASSWORDS[ROLES.STUDENT])) role = ROLES.STUDENT;
        else if (password === PASSWORDS[ROLES.PARENT]) role = ROLES.PARENT;

        if (role) {
          localStorage.setItem('userRole', role);
          localStorage.setItem('studentId', legacyStudent.id);
          return { success: true, role, studentId: legacyStudent.id };
        }
      }
    }

  } catch (err) {
    console.error("Auth Error:", err);
  }

  return { success: false };
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
