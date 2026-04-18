import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, User } from 'lucide-react';
import { addStudent } from '../services/studentService';
import { uploadToCloudinary } from '../services/cloudinary';
import { getRole, ROLES } from '../services/auth';
import { useHeader } from '../hooks/useHeader';
import Modal from '../components/Modal';
import '../styles/Students.css';

import { useData } from '../context/DataContext';

const Students = () => {
  const navigate = useNavigate();
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const { setHeaderAction } = useHeader();
  const { students: allStudents, batches, loading: contextLoading } = useData();
  const loading = contextLoading.students || contextLoading.batches;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(searchParams.get('batchId') || '');

  
  // Form State
  const [formData, setFormData] = useState({
    name: '', batchId: '', guardianName: '', guardianPhone: '', guardianWhatsApp: '',
    motherName: '', fatherJob: '', studentPhone: '', studentWhatsApp: '',
    age: '', houseName: '', place: '', address: '', schoolClass: '',
    bloodGroup: '', avatarUrl: '', avatarPublicId: null, password: '', username: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  useEffect(() => {
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

  // Redundant fetchData removed - context handles it now

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadLoading(true);
    try {
      let finalData = { ...formData };
      
      if (selectedFile) {
        const cloudData = await uploadToCloudinary(selectedFile);
        finalData.avatarUrl = cloudData.secure_url;
        finalData.avatarPublicId = cloudData.public_id;
      } else {
        finalData.avatarPublicId = null;
      }

      await addStudent(finalData);
      setIsModalOpen(false);
      resetForm();
// No refresh needed with onSnapshot
    } catch (error) {
      console.error("Error saving student:", error);
      alert("Failed to save student. Check console for details.");
    }
    setUploadLoading(false);
  };



  const resetForm = () => {
    setFormData({
      name: '',
      batchId: '',
      guardianName: '',
      guardianPhone: '',
      guardianWhatsApp: '',
      motherName: '',
      fatherJob: '',
      studentPhone: '',
      studentWhatsApp: '',
      age: '',
      schoolClass: '',
      bloodGroup: '',
      houseName: '',
      place: '',
      address: '',
      avatarUrl: '',
      avatarPublicId: null,
      password: '',
      username: ''
    });
    setSelectedFile(null);
  };

  useEffect(() => {
    if (isAdmin) {
      setHeaderAction(
        <button className="add-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Add New</span>
        </button>
      );
    }
    return () => setHeaderAction(null);
  }, [isAdmin, setHeaderAction]);

  const filteredStudents = allStudents.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.place && s.place.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.houseName && s.houseName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesBatch = selectedBatch === '' || s.batchId === selectedBatch;
    
    return matchesSearch && matchesBatch;
  });

  return (
    <div className="students-page">

      <div className="filters-container glass">
        <div className="search-input">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search name or place..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="batch-filter">
          <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
            <option value="">All Batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loader">Loading students...</div>
      ) : (
        <div className="cards-grid">
          {filteredStudents.map(student => {
            const batch = batches.find(b => b.id === student.batchId);
            return (
              <div key={student.id} className="compact-card" onClick={() => navigate(`/dashboard/students/${student.id}`)}>
                <div className="avatar-mini">
                  {student.avatarUrl ? <img src={student.avatarUrl} alt="" /> : student.name.charAt(0)}
                </div>
                <div className="card-info">
                  <span className="card-name">{student.name}</span>
                  <span className="card-sub">{[student.houseName, student.place].filter(Boolean).join(', ') || 'No Address'}</span>
                  <div className="card-tag">{batch?.batchName || 'N/A'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Register New Student"
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="avatar-side-section">
            <div className="preview-container">
              <div className="preview-circle">
                {previewUrl ? <img src={previewUrl} alt="Preview" /> : <User size={32} />}
              </div>
              <span className="mini-label">Photo</span>
            </div>
            
            <div className="avatar-inputs">
              <div className="input-row">
                <label>Upload File</label>
                <input type="file" onChange={handleFileChange} accept="image/*" className="file-input-compact" />
              </div>
              <div className="input-row">
                <label>Or Paste URL</label>
                <input name="avatarUrl" value={formData.avatarUrl} onChange={handleInputChange} placeholder="https://image-url.com" className="url-input-compact" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="section-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input name="name" value={formData.name} onChange={handleInputChange} required placeholder="Student's name" />
              </div>
              <div className="form-group">
                <label>House Name</label>
                <input name="houseName" value={formData.houseName} onChange={handleInputChange} placeholder="e.g. Baitul Aman" />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleInputChange} placeholder="e.g. 15" />
              </div>
              <div className="form-group">
                <label>Place / City</label>
                <input name="place" value={formData.place} onChange={handleInputChange} placeholder="e.g. Malappuram" />
              </div>
              <div className="form-group">
                <label>Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Full Address</label>
              <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="House name, street, etc." rows="2" />
            </div>
          </div>

          <div className="form-section">
            <h3>Academic Info</h3>
            <div className="section-grid">
              <div className="form-group">
                <label>Admission Batch *</label>
                <select name="batchId" value={formData.batchId} onChange={handleInputChange} required>
                  <option value="">Select Batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Current School Class</label>
                <input name="schoolClass" value={formData.schoolClass} onChange={handleInputChange} placeholder="e.g. 10th Standard" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Guardian Details</h3>
            <div className="section-grid">
              <div className="form-group">
                <label>Guardian Name *</label>
                <input name="guardianName" value={formData.guardianName} onChange={handleInputChange} required placeholder="Father or Guardian" />
              </div>
              <div className="form-group">
                <label>Mother's Name</label>
                <input name="motherName" value={formData.motherName} onChange={handleInputChange} placeholder="Student's mother" />
              </div>
              <div className="form-group">
                <label>Father's Job</label>
                <input name="fatherJob" value={formData.fatherJob} onChange={handleInputChange} placeholder="e.g. Teacher, Farmer" />
              </div>
              <div className="form-group">
                <label>Guardian Phone *</label>
                <input name="guardianPhone" value={formData.guardianPhone} onChange={handleInputChange} required placeholder="Mobile number" />
              </div>
              <div className="form-group">
                <label>Guardian WhatsApp</label>
                <input name="guardianWhatsApp" value={formData.guardianWhatsApp} onChange={handleInputChange} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Student Contact</h3>
            <div className="section-grid">
              <div className="form-group">
                <label>Student Phone</label>
                <input name="studentPhone" value={formData.studentPhone} onChange={handleInputChange} placeholder="Student's mobile" />
              </div>
              <div className="form-group">
                <label>Student WhatsApp</label>
                <input name="studentWhatsApp" value={formData.studentWhatsApp} onChange={handleInputChange} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Login Credentials</h3>
            <div className="section-grid">
              <div className="form-group">
                <label>Custom Username</label>
                <input name="username" value={formData.username} onChange={handleInputChange} placeholder="Default: student name" />
              </div>
              <div className="form-group">
                <label>Student Password</label>
                <input name="password" value={formData.password} onChange={handleInputChange} placeholder="Default: 111111" />
              </div>
            </div>
            <p className="field-note">If username is not added, the student's name will be used as the username.</p>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="save-btn" disabled={uploadLoading}>
              {uploadLoading ? 'Saving...' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
