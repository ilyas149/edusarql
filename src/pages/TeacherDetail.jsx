import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, orderBy, getDocs } from 'firebase/firestore';
import { User, Phone, MapPin, Edit2, Trash2, MessageSquare, Briefcase, Calendar, Heart, ChevronLeft, CheckCircle2, X } from 'lucide-react';
import { getRole, ROLES, isUsernameTaken, getTeacherId } from '../services/auth';

import { updateTeacher, deleteTeacher } from '../services/teacherService';
import { uploadToCloudinary } from '../services/cloudinary';
import { useHeader } from '../hooks/useHeader';
import Modal from '../components/Modal';
import '../styles/StudentDetail.css';
import { useData } from '../context/DataContext';
import { formatTime12h } from '../services/utils';


const TeacherDetail = ({ teacherId: propId }) => {
  const { id: routeId } = useParams();
  const id = propId || routeId;
  const navigate = useNavigate();
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const isTeacher = role === ROLES.TEACHER;
  const canContact = isAdmin || isTeacher;
  const { setHeaderAction, setBackAction } = useHeader();
  const { teachers, loading: contextLoading } = useData();
  const loggedInTeacherId = getTeacherId();
  const canSeeAttendance = isAdmin || (isTeacher && id === loggedInTeacherId);


  const teacher = useMemo(() => teachers.find(t => t.id === id), [teachers, id]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');

  const initialSetupRef = React.useRef(false);
  useEffect(() => {
    if (teachers.length > 0) {
      if (teacher) {
        if (!initialSetupRef.current) {
          Promise.resolve().then(() => setEditFormData(teacher));
          initialSetupRef.current = true;
        }
        Promise.resolve().then(() => setLoading(false));
      } else if (!contextLoading.teachers) {
        navigate('/dashboard/teachers');
      }
    }
  }, [teachers, teacher, id, navigate, contextLoading.teachers]);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      Promise.resolve().then(() => setPreviewUrl(url));
      return () => URL.revokeObjectURL(url);
    } else if (editFormData.avatarUrl) {
      Promise.resolve().then(() => setPreviewUrl(editFormData.avatarUrl));
    } else {
      Promise.resolve().then(() => setPreviewUrl(null));
    }
  }, [selectedFile, editFormData.avatarUrl]);

  const handleDeleteProfile = useCallback(async () => {
    if (window.confirm("Are you sure you want to delete this teacher permanently?")) {
      try {
        await deleteTeacher(teacher.id, teacher.avatarPublicId);
        navigate('/dashboard/teachers');
      } catch (err) {
        console.error(err);
      }
    }
  }, [teacher, navigate]);

  useEffect(() => {
    const backBtn = (
      <button className="back-round-btn" onClick={() => navigate(-1)} title="Back">
        <ChevronLeft size={20} />
      </button>
    );
    setBackAction(backBtn);

    if (isAdmin && teacher) {
      setHeaderAction(
        <div className="header-actions-group">
          <button className="header-icon-btn" onClick={() => setIsEditModalOpen(true)} title="Edit Profile">
            <Edit2 size={18} />
          </button>
          <button className="header-icon-btn delete" onClick={handleDeleteProfile} title="Delete Teacher">
            <Trash2 size={18} />
          </button>
        </div>
      );
    }
    return () => {
      setBackAction(null);
      setHeaderAction(null);
    };
  }, [isAdmin, teacher, navigate, setHeaderAction, setBackAction, handleDeleteProfile]);

  const handleUpdateTeacher = useCallback(async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      let finalData = { ...editFormData };

      // 0. Validate required credentials
      const cleanUser = (finalData.username || "").trim();
      if (!cleanUser || !finalData.password) {
        alert("Username and Password are required for teacher accounts.");
        setSaveLoading(false);
        return;
      }

      // 1. Check for unique username (excluding self)
      const taken = await isUsernameTaken(cleanUser, teacher.id);
      if (taken) {
        alert(`The username "${cleanUser}" is already taken by another user.`);
        setSaveLoading(false);
        return;
      }

      if (selectedFile) {
        const cloudData = await uploadToCloudinary(selectedFile);
        finalData.avatarUrl = cloudData.secure_url;
        finalData.avatarPublicId = cloudData.public_id;
      }

      finalData.username = cleanUser.toLowerCase().replace(/\s/g, ''); // Ensure consistent format

      await updateTeacher(teacher.id, finalData);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to update teacher profile.");
    }
    setSaveLoading(false);
  }, [editFormData, selectedFile, teacher]);

  if (loading || !teacher) return <div className="loader">Loading Profile...</div>;

  return (
    <div className="student-detail-page">
      <div className="profile-header-new">
        <div className="header-left">
          <div
            className="profile-avatar-large"
            onClick={() => teacher.avatarUrl && setIsImageModalOpen(true)}
            style={{ cursor: teacher.avatarUrl ? 'pointer' : 'default' }}
          >
            {teacher.avatarUrl ? <img src={teacher.avatarUrl} alt="" /> : teacher.name.charAt(0)}
          </div>
          <div className="profile-titles">
            <h1>{teacher.name}</h1>
            <div className="profile-subtitle">
              <span className="id-tag">{teacher.department || 'Staff'} | {[teacher.houseName, teacher.place].filter(Boolean).join(', ') || 'No Place'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-nav-tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
        {canSeeAttendance && <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>Attendance</button>}
      </div>


      <div className="profile-content-body">
        <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
          <div className="profile-data-sections">
            <section className="profile-card">
              <div className="card-header">
                <Briefcase size={16} />
                <h3>Professional Information</h3>
              </div>
              <div className="data-grid-layout">
                <div className="data-item"><label>Department / Subject</label><p>{teacher.department || 'N/A'}</p></div>
                <div className="data-item"><label>Age</label><p>{teacher.age || 'N/A'}</p></div>
                <div className="data-item"><label>Blood Group</label><p><Heart size={12} className="ico-red" /> {teacher.bloodGroup || 'N/A'}</p></div>
                <div className="data-item"><label>House Name</label><p>{teacher.houseName || 'N/A'}</p></div>
                <div className="data-item full-width"><label>Full Address</label><p>{teacher.address || 'N/A'}</p></div>
                <div className="data-item full-width"><label>Place</label><p><MapPin size={12} /> {teacher.place || 'N/A'}</p></div>
              </div>
            </section>

            <section className="profile-card">
              <div className="card-header">
                <Phone size={16} />
                <h3>Direct Contact</h3>
              </div>
              <div className="data-grid-layout">
                <div className="data-item">
                  <label>Phone Number</label>
                  <div className="contact-row">
                    <p>{teacher.phone || 'N/A'}</p>
                    {canContact && teacher.phone && (
                      <a href={`tel:${teacher.phone}`} className="contact-icon-btn call">
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="data-item">
                  <label>WhatsApp Number</label>
                  <div className="contact-row">
                    <p>{teacher.whatsapp || teacher.phone || 'N/A'}</p>
                    {canContact && (teacher.whatsapp || teacher.phone) && (
                      <a
                        href={`https://wa.me/${(teacher.whatsapp || teacher.phone).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-icon-btn whatsapp"
                      >
                        <MessageSquare size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {canSeeAttendance && (
          <div style={{ display: activeTab === 'attendance' ? 'block' : 'none' }}>
            <TeacherAttendanceSection teacherId={id} teacherName={teacher.name} isAdmin={isAdmin} />
          </div>
        )}
      </div>


      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        variant="image"
      >
        <div className="full-image-view">
          <img src={teacher.avatarUrl} alt={teacher.name} />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Teacher Profile"
      >
        <form onSubmit={handleUpdateTeacher}>
          <TeacherEditForm
            formData={editFormData}
            setFormData={setEditFormData}
            setSelectedFile={setSelectedFile}
            previewUrl={previewUrl}
          />
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            <button type="submit" className="save-btn" disabled={saveLoading}>
              {saveLoading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const TeacherAttendanceSection = ({ teacherId, isAdmin }) => {
  const loggedInTeacherId = localStorage.getItem('teacherId');
  const canMark = isAdmin || (loggedInTeacherId === teacherId);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    if (getRole() === ROLES.TEACHER) return new Date().toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  });
  const [periods, setPeriods] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const role = getRole();



  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const q = query(collection(db, 'staff_periods'), orderBy('startTime', 'asc'));
        const snap = await getDocs(q);
        const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPeriods(results);


      } catch (err) {
        console.error("Error fetching staff periods:", err);
      }
    };
    fetchPeriods();
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      // Only show full loader if we don't have data yet
      if (!attendance || Object.keys(attendance).length === 0) {
        Promise.resolve().then(() => setLoading(true));
      }
      try {
        const docRef = doc(db, 'staff_attendance', selectedDate);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setAttendance(data.records?.[teacherId] || {});
        } else {
          setAttendance({});
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
      }
      setLoading(false);
    };
    if (teacherId && selectedDate) {
      fetchAttendance();
    }
  }, [teacherId, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps



  const handleMark = async (periodId, status) => {
    if (!canMark) {
      alert("Unauthorized: You can only mark your own attendance.");
      return;
    }
    setSaving(true);
    try {
      const docRef = doc(db, 'staff_attendance', selectedDate);
      const snap = await getDoc(docRef);
      let allRecords = snap.exists() ? snap.data().records || {} : {};
      
      if (!allRecords[teacherId]) allRecords[teacherId] = {};
      allRecords[teacherId][periodId] = status;

      await setDoc(docRef, { 
        date: selectedDate, 
        records: allRecords,
        updatedAt: serverTimestamp() 
      }, { merge: true });
      
      setAttendance(prev => ({ ...prev, [periodId]: status }));
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="attendance-section fadeIn">
      <div className="section-controls">
        {role !== ROLES.TEACHER && (
          <div className="date-picker-wrap">
            <Calendar size={16} />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>


      {periods.length === 0 ? (
        <div className="empty-state">No staff work sessions have been defined.</div>
      ) : loading ? (

        <div className="loader small">Syncing Records...</div>
      ) : (
        <div className="attendance-grid">
          {periods.map(period => {
            const now = new Date();
            const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const isCurrent = currentTimeStr >= period.startTime && currentTimeStr <= period.endTime;
            const canMarkThis = isAdmin || (loggedInTeacherId === teacherId && (role !== ROLES.TEACHER || isCurrent));

            return (
              <div key={period.id} className={`attendance-row ${isCurrent ? 'current-active' : ''} ${attendance[period.id] === 'present' ? 'present-marked' : ''}`}>

                <div className="period-info">
                  <div className="p-header-row">
                    <span className="p-name">{period.name}</span>
                    {isCurrent && <span className="current-badge">Active Now</span>}
                  </div>
                  <span className="p-time">{formatTime12h(period.startTime)} - {formatTime12h(period.endTime)}</span>
                </div>
                <div className="attendance-actions">
                  <button 
                    className={`status-btn present ${attendance[period.id] === 'present' ? 'active' : ''}`}
                    onClick={() => handleMark(period.id, 'present')}
                    disabled={saving || !canMarkThis}
                    title={!canMarkThis ? "Attendance can only be marked during the active session time." : ""}
                  >
                    <CheckCircle2 size={16} />
                    <span>Present</span>
                  </button>
                  <button 
                    className={`status-btn absent ${attendance[period.id] === 'absent' ? 'active' : ''}`}
                    onClick={() => handleMark(period.id, 'absent')}
                    disabled={saving || !canMarkThis}
                    title={!canMarkThis ? "Attendance can only be marked during the active session time." : ""}
                  >
                    <X size={16} />
                    <span>Absent</span>
                  </button>
                </div>
              </div>
            );
          })}

        </div>
      )}

      <style>{`
        .attendance-section {
          background: white;
          padding: 6px;
          border-radius: 16px;
          border: 1px solid var(--border-color);
          animation: fadeIn 0.3s ease;
        }
        .section-controls {
          margin-bottom: 24px;
          display: flex;
          justify-content: flex-end;
        }
        .date-picker-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          color: #64748b;
        }
        .date-picker-wrap input {
          border: none;
          background: transparent;
          font-weight: 700;
          color: #334155;
          outline: none;
        }
        .attendance-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .attendance-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #fcfcfc;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
        }
        .period-info {
          display: flex;
          flex-direction: column;
        }
        .period-info .p-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.95rem;
        }
        .period-info .p-time {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }
        .attendance-actions {
          display: flex;
          gap: 8px;
        }
        .status-btn {
          padding: 8px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
          background: white;
          color: #94a3b8;
        }
        .status-btn.present.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .status-btn.absent.active {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        .status-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(1);
        }
        .current-active {
          border-color: var(--primary);
          background: #fff1f2;
        }
        .attendance-row.present-marked {
          border-color: #10b981;
          background: #ecfdf5;
        }

        .p-header-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .current-badge {
          font-size: 0.6rem;
          font-weight: 900;
          background: var(--primary);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        @media (max-width: 500px) {
          .attendance-row { padding: 10px 12px; }
          .period-info .p-name { font-size: 0.85rem; }
          .period-info .p-time { font-size: 0.65rem; }
          .status-btn { padding: 6px 10px; font-size: 0.7rem; gap: 4px; }
          .status-btn svg { width: 12px; height: 12px; }
          .current-badge { font-size: 0.5rem; padding: 1px 4px; }
          .attendance-actions { gap: 4px; }
        }
      `}</style>


    </div>
  );
};

const TeacherEditForm = ({ formData, setFormData, setSelectedFile, previewUrl }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
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
            <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} accept="image/*" className="file-input-compact" />
          </div>
          <div className="input-row">
            <label>Or Image URL</label>
            <input name="avatarUrl" value={formData.avatarUrl || ''} onChange={handleInputChange} placeholder="https://..." className="url-input-compact" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Personal Information</h3>
        <div className="section-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input name="name" value={formData.name || ''} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>House Name</label>
            <input name="houseName" value={formData.houseName || ''} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Department / Subject</label>
            <input name="department" value={formData.department || ''} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Blood Group</label>
            <select name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleInputChange}>
              <option value="">Select</option>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Place</label>
            <input name="place" value={formData.place || ''} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input name="age" value={formData.age || ''} onChange={handleInputChange} />
          </div>
        </div>
        <div className="form-group">
          <label>Full Address</label>
          <textarea name="address" value={formData.address || ''} onChange={handleInputChange} rows="2" />
        </div>
      </div>

      <div className="form-section">
        <h3>Contact Details</h3>
        <div className="section-grid">
          <div className="form-group">
            <label>Phone Number</label>
            <input name="phone" value={formData.phone || ''} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>WhatsApp Number</label>
            <input name="whatsapp" value={formData.whatsapp || ''} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Login Credentials</h3>
        <div className="section-grid">
          <div className="form-group">
            <label>Username *</label>
            <input name="username" value={formData.username || ''} onChange={handleInputChange} placeholder="Unique username" required />
          </div>
          <div className="form-group">
            <label>Personal Password *</label>
            <input name="password" value={formData.password || ''} onChange={handleInputChange} placeholder="Set password" required />
          </div>
        </div>
        <p className="field-note" style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>Username and Password are now mandatory for security.</p>
      </div>
    </div>
  );
};

export default TeacherDetail;
