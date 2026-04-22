import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Plus, Search } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot, collection, query, orderBy, getDocs } from 'firebase/firestore';

import { useHeader } from '../hooks/useHeader';
import Modal from '../components/Modal';
import { getRole, ROLES } from '../services/auth';
import { uploadToCloudinary } from '../services/cloudinary';
import { addTeacher } from '../services/teacherService';
import { useData } from '../context/DataContext';
import { isUsernameTaken } from '../services/auth';
import TeacherDetail from './TeacherDetail';


const Teachers = () => {
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const { setHeaderAction } = useHeader();
  const { teachers, loading: contextLoading } = useData();
  const loading = contextLoading.teachers;
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  
  const isAddModalOpen = searchParams.get('modal') === 'add';
  const activeTeacherId = searchParams.get('teacherId');

  const departments = useMemo(() => {
    const depts = new Set();
    teachers.forEach(t => { if (t.department) depts.add(t.department); });
    return Array.from(depts);
  }, [teachers]);

  const openAddModal = React.useCallback(() => setSearchParams(prev => {
    prev.set('modal', 'add');
    prev.delete('teacherId');
    return prev;
  }), [setSearchParams]);

  const closeModals = React.useCallback(() => setSearchParams(prev => {
    prev.delete('modal');
    prev.delete('teacherId');
    return prev;
  }), [setSearchParams]);

  const openTeacherDetail = React.useCallback((id) => setSearchParams(prev => {
    prev.set('teacherId', id);
    prev.delete('modal');
    return prev;
  }), [setSearchParams]);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    age: '',
    houseName: '',
    place: '',
    address: '',
    bloodGroup: '',
    phone: '',
    whatsapp: '',
    avatarUrl: '',
    avatarPublicId: null,
    password: '',
    username: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [staffPeriods, setStaffPeriods] = useState([]);

  useEffect(() => {
    const fetchStaffPeriods = async () => {
      const q = query(collection(db, 'staff_periods'), orderBy('startTime', 'asc'));
      const snap = await getDocs(q);
      setStaffPeriods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchStaffPeriods();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'staff_attendance', today);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setAttendance(snap.data().records || {});
      } else {
        setAttendance({});
      }
    });
    return () => unsub();
  }, []);


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  useEffect(() => {
    // Cleanup preview URL
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!selectedFile && formData.avatarUrl) {
      Promise.resolve().then(() => setPreviewUrl(formData.avatarUrl));
    } else if (!selectedFile && !formData.avatarUrl) {
      Promise.resolve().then(() => setPreviewUrl(null));
    }
  }, [selectedFile, formData.avatarUrl]);

  // Data handled by DataContext automatically

  useEffect(() => {
    if (isAdmin) {
      setHeaderAction(
        <button className="add-btn" onClick={openAddModal}>
          <Plus size={16} />
          <span>Add Teacher</span>
        </button>
      );
    }
    return () => setHeaderAction(null);
  }, [isAdmin, setHeaderAction, openAddModal]);

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.place && t.place.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDept = selectedDept === '' || t.department === selectedDept;
    
    return matchesSearch && matchesDept;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      let finalData = { ...formData };

      // 0. Validate required credentials
      const cleanUser = (finalData.username || "").trim();
      if (!cleanUser || !finalData.password) {
        alert("Username and Password are required for teacher enrollment.");
        setSaveLoading(false);
        return;
      }

      // 1. Check for unique username
      const taken = await isUsernameTaken(cleanUser);
      if (taken) {
        alert(`The username "${cleanUser}" is already taken. Please choose another one.`);
        setSaveLoading(false);
        return;
      }

      if (selectedFile) {
        const cloudData = await uploadToCloudinary(selectedFile);
        finalData.avatarUrl = cloudData.secure_url;
        finalData.avatarPublicId = cloudData.public_id;
      }

      finalData.username = cleanUser.toLowerCase().replace(/\s/g, ''); // Ensure consistent format

      await addTeacher(finalData);
      closeModals();
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Failed to add teacher.");
    }
    setSaveLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '', department: '', age: '', houseName: '', place: '',
      address: '', bloodGroup: '', phone: '', whatsapp: '',
      avatarUrl: '', avatarPublicId: null, password: '', username: ''
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="students-page">
      <div className="filters-container glass">
        <div className="search-input">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search staff or department..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="batch-filter">
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="loader">Loading teachers...</div>
      ) : (
        <div className="cards-grid">
          {filteredTeachers.map(teacher => {
            const now = new Date();
            const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const currentPeriod = staffPeriods.find(p => currentTimeStr >= p.startTime && currentTimeStr <= p.endTime);
            const status = currentPeriod ? attendance[teacher.id]?.[currentPeriod.id] : null;
            const isPresent = status === 'present';

            return (
              <div 
                key={teacher.id} 
                className={`compact-card teacher-card ${isPresent ? 'is-present' : ''}`} 
                onClick={() => openTeacherDetail(teacher.id)}
              >
                <div className="avatar-mini">
                  {teacher.avatarUrl ? <img src={teacher.avatarUrl} alt="" /> : teacher.name.charAt(0)}
                </div>
                <div className="card-info">
                  <span className="card-name">{teacher.name}</span>
                  <span className="card-sub">{teacher.place || 'No Place'}</span>
                  <div className="card-tag">{teacher.department || 'Staff'}</div>
                </div>
                {isPresent && <div className="status-dot-green"></div>}

              </div>
            );
          })}

        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={closeModals}
        title="Register New Teacher"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="avatar-side-section">
              <div className="preview-container">
                <div className="preview-circle">
                  {previewUrl ? <img src={previewUrl} alt="Preview" /> : <User size={32} />}
                </div>
                <span className="mini-label">Photo</span>
              </div>
              <div className="avatar-inputs">
                <div className="input-row">
                  <label>Upload New</label>
                  <input type="file" onChange={handleFileChange} accept="image/*" className="file-input-compact" />
                </div>
                <div className="input-row">
                  <label>Or Image URL</label>
                  <input name="avatarUrl" value={formData.avatarUrl} onChange={handleInputChange} placeholder="https://..." className="url-input-compact" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Personal Information</h3>
              <div className="section-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>House Name</label>
                  <input name="houseName" value={formData.houseName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Department / Subject</label>
                  <input name="department" value={formData.department} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Blood Group</label>
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input name="age" value={formData.age} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Place</label>
                  <input name="place" value={formData.place} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Full Address</label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} rows="2" />
              </div>
            </div>

            <div className="form-section">
              <h3>Contact Details</h3>
              <div className="section-grid">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>WhatsApp Number</label>
                  <input name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Login Credentials</h3>
              <div className="section-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input name="username" value={formData.username} onChange={handleInputChange} placeholder="Unique username" required />
                </div>
                <div className="form-group">
                  <label>Personal Login Password *</label>
                  <input name="password" value={formData.password} onChange={handleInputChange} placeholder="Set password" required />
                </div>
              </div>
              <p className="field-note" style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>Username and Password are now mandatory for institutional security.</p>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={closeModals}>Cancel</button>
            <button type="submit" className="save-btn" disabled={saveLoading}>
              {saveLoading ? 'Registering...' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Teacher Details Overlay (History-linked) */}
      <Modal
        isOpen={!!activeTeacherId}
        onClose={closeModals}
        title="Teacher Details"
        variant="fullscreen"
      >
        {activeTeacherId && <TeacherDetail teacherId={activeTeacherId} />}
      </Modal>
    </div>
  );
};

export default Teachers;
