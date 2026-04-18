import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import axios from 'axios';
import CryptoJS from 'crypto-js';

const STUDENT_COLLECTION = 'students';
const BATCH_COLLECTION = 'batches';

export const getStudents = async () => {
  const querySnapshot = await getDocs(collection(db, STUDENT_COLLECTION));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getStudentById = async (id) => {
  const docRef = doc(db, STUDENT_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

export const addStudent = async (studentData) => {
  const data = {
    ...studentData,
    searchName: (studentData.name || "").toLowerCase().replace(/\s/g, '')
  };
  return await addDoc(collection(db, STUDENT_COLLECTION), data);
};

export const updateStudent = async (id, studentData) => {
  const data = {
    ...studentData
  };
  if (studentData.name) {
    data.searchName = studentData.name.toLowerCase().replace(/\s/g, '');
  }
  const studentRef = doc(db, STUDENT_COLLECTION, id);
  return await updateDoc(studentRef, data);
};

export const deleteStudent = async (id, avatarPublicId) => {
  if (avatarPublicId) {
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
      const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;
      const timestamp = Math.round((new Date()).getTime() / 1000);
      
      // Generate Signature needed by Cloudinary Destroy API
      const signatureStr = `public_id=${avatarPublicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = CryptoJS.SHA1(signatureStr).toString();

      const formData = new FormData();
      formData.append("public_id", avatarPublicId);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("signature", signature);

      await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, formData);
      console.log("Image deleted successfully from Cloudinary (client-side)");
    } catch (error) {
      console.error("Error deleting image from Cloudinary (client-side):", error);
    }
  }
  const studentRef = doc(db, STUDENT_COLLECTION, id);
  return await deleteDoc(studentRef);
};

export const getBatches = async () => {
  const querySnapshot = await getDocs(collection(db, BATCH_COLLECTION));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
