import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, BookOpen, Edit2, Search, GraduationCap } from 'lucide-react';
import { getRole, ROLES } from '../services/auth';
import { useHeader } from '../hooks/useHeader';
import Modal from '../components/Modal';

import { useData } from '../context/DataContext';

const Subjects = () => {
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const { setHeaderAction } = useHeader();
  const { subjects, loading: contextLoading } = useData();
  const loading = contextLoading.subjects;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  // Data handled by DataContext automatically

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      if (isEditMode) {
        await updateDoc(doc(db, 'subjects', editingId), formData);
      } else {
        await addDoc(collection(db, 'subjects'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setFormData({ name: '', code: '' });
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
// No manual fetch needed with real-time sync
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (subject) => {
    setFormData({ name: subject.name, code: subject.code || '' });
    setEditingId(subject.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this subject? This might affect existing timetables.")) {
      await deleteDoc(doc(db, 'subjects', id));
// No manual fetch needed with real-time sync
    }
  };

  useEffect(() => {
    if (isAdmin) {
      setHeaderAction(
        <button className="add-btn" onClick={() => { setIsEditMode(false); setFormData({ name: '', code: '' }); setIsModalOpen(true); }}>
          <Plus size={16} />
          <span>Add New Subject</span>
        </button>
      );
    }
    return () => setHeaderAction(null);
  }, [isAdmin, setHeaderAction]);

  return (
    <div className="subjects-page">
      {loading ? (
        <div className="loader">Hydrating Subject List...</div>
      ) : (
        <div className="subjects-table-wrapper glass">
           <div className="list-header">
              <div className="h-name">Subject Name</div>
              <div className="h-code">Identifier Code</div>
              {isAdmin && <div className="h-actions">Management</div>}
           </div>
           
           <div className="list-body">
              {subjects.length === 0 ? (
                <div className="empty-list">No subjects registered yet.</div>
              ) : (
                subjects.map(subject => (
                  <div key={subject.id} className="subject-row">
                     <div className="s-info">
                        <div className="s-icon"><BookOpen size={16}/></div>
                        <span className="s-name">{subject.name}</span>
                     </div>
                     <div className="s-code">
                        <span className="code-badge">{subject.code || 'NO-CODE'}</span>
                     </div>
                     {isAdmin && (
                       <div className="s-actions">
                          <button className="row-btn edit" onClick={() => handleEdit(subject)}>
                             <Edit2 size={14} />
                          </button>
                          <button className="row-btn delete" onClick={() => handleDelete(subject.id)}>
                             <Trash2 size={14} />
                          </button>
                       </div>
                     )}
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Manage Subject" : "Register Subject"}>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="form-group">
               <label>Official Subject Title</label>
               <input 
                 value={formData.name} 
                 onChange={(e) => setFormData({...formData, name: e.target.value})} 
                 placeholder="e.g. Traditional Arabic Grammar" 
                 required 
               />
            </div>
            <div className="form-group">
               <label>Academic Code (Recommended)</label>
               <input 
                 value={formData.code} 
                 onChange={(e) => setFormData({...formData, code: e.target.value})} 
                 placeholder="e.g. ARB-101" 
               />
            </div>
          </div>
          <div className="modal-actions">
             <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Discard</button>
             <button type="submit" className="save-btn">{isEditMode ? 'Update Subject' : 'Save Subject'}</button>
          </div>
        </form>
      </Modal>

      <style>{`
        .subjects-page { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .page-intro { margin-bottom: 24px; }
        .page-intro h1 { font-size: 1.4rem; color: #1e293b; display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .p-icon { color: var(--primary); }
        .page-intro p { font-size: 0.85rem; color: #64748b; }

        .subjects-table-wrapper { border-radius: 12px; overflow: hidden; background: white; border: 1px solid #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        
        .list-header { display: grid; grid-template-columns: 2fr 1fr 100px; padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .h-actions { text-align: right; }

        .list-body { 
          max-height: 600px; 
          overflow-y: auto; 
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        .list-body::-webkit-scrollbar {
          display: none; /* Chrome/Safari/Webkit */
        }
        .subject-row { display: grid; grid-template-columns: 2fr 1fr 100px; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f8fafc; transition: background 0.15s; }
        .subject-row:hover { background: #fffdfd; }
        .subject-row:last-child { border-bottom: none; }

        .s-info { display: flex; align-items: center; gap: 12px; }
        .s-icon { width: 32px; height: 32px; border-radius: 8px; background: #fff1f2; color: var(--primary); display: flex; align-items: center; justify-content: center; }
        .s-name { font-weight: 700; color: #334155; font-size: 0.9rem; }

        .s-code { }
        .code-badge { font-size: 0.7rem; font-weight: 800; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; }

        .s-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .row-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #f1f5f9; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #94a3b8; }
        .row-btn.edit:hover { color: var(--primary); border-color: var(--primary); background: #fff1f2; }
        .row-btn.delete:hover { color: #ef4444; border-color: #ef4444; background: #fef2f2; }

        .empty-list { text-align: center; padding: 60px; color: #cbd5e1; font-weight: 600; font-style: italic; }

        @media (max-width: 600px) {
           .list-header { display: none; }
           .subject-row { grid-template-columns: 1fr auto; gap: 12px; }
           .s-code { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Subjects;
