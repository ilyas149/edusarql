import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { User, Phone, MapPin, Edit2, Trash2, MessageSquare, Briefcase, Calendar, Heart, ChevronLeft } from 'lucide-react';
import { getRole, ROLES } from '../services/auth';
import { updateTeacher, deleteTeacher } from '../services/teacherService';
import { uploadToCloudinary } from '../services/cloudinary';
import { useHeader } from '../hooks/useHeader';
import Modal from '../components/Modal';
import '../styles/StudentDetail.css';
import { useData } from '../context/DataContext';

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

  const teacher = useMemo(() => teachers.find(t => t.id === id), [teachers, id]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

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
      if (selectedFile) {
        const cloudData = await uploadToCloudinary(selectedFile);
        finalData.avatarUrl = cloudData.secure_url;
        finalData.avatarPublicId = cloudData.public_id;
      }
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

      <div className="profile-content-body">
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
            <label>Custom Username</label>
            <input name="username" value={formData.username || ''} onChange={handleInputChange} placeholder="Default: Name" />
          </div>
          <div className="form-group">
            <label>Personal Password</label>
            <input name="password" value={formData.password || ''} onChange={handleInputChange} placeholder="Institutional Default" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDetail;
