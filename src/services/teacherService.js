import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import axios from 'axios';
import CryptoJS from 'crypto-js';

const TEACHER_COLLECTION = 'teachers';

export const getTeachers = async () => {
  const querySnapshot = await getDocs(collection(db, TEACHER_COLLECTION));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getTeacherById = async (id) => {
  const docRef = doc(db, TEACHER_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const addTeacher = async (teacherData) => {
  const data = {
    ...teacherData,
    searchName: (teacherData.name || "").toLowerCase().replace(/\s/g, '')
  };
  return await addDoc(collection(db, TEACHER_COLLECTION), data);
};

export const updateTeacher = async (id, teacherData) => {
  const data = {
    ...teacherData
  };
  if (teacherData.name) {
    data.searchName = teacherData.name.toLowerCase().replace(/\s/g, '');
  }
  const teacherRef = doc(db, TEACHER_COLLECTION, id);
  return await updateDoc(teacherRef, data);
};

export const deleteTeacher = async (id, avatarPublicId) => {
  if (avatarPublicId) {
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
      const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;
      const timestamp = Math.round((new Date()).getTime() / 1000);
      
      const signatureStr = `public_id=${avatarPublicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = CryptoJS.SHA1(signatureStr).toString();

      const formData = new FormData();
      formData.append("public_id", avatarPublicId);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("signature", signature);

      await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, formData);
    } catch (error) {
      console.error("Cloudinary delete error:", error);
    }
  }
  const teacherRef = doc(db, TEACHER_COLLECTION, id);
  return await deleteDoc(teacherRef);
};
