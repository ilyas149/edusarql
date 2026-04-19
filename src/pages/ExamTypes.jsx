import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, BookOpen, Calendar, AlignLeft, Pencil, X } from 'lucide-react';
import { ROLES } from '../services/auth';
import { useHeader } from '../hooks/useHeader';
import { useData } from '../context/DataContext';
import Modal from '../components/Modal';

const ExamTypes = () => {
  const { setHeaderAction } = useHeader();
  const { examTypes, loading: contextLoading } = useData();
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  const loading = contextLoading.examTypes || localLoading;

  const [formData, setFormData] = useState({
    title: '',
    year: new Date().getFullYear().toString(),
    description: ''
  });

  const handleToggleForm = React.useCallback(() => {
    if (showForm) {
      setFormData({ title: '', year: new Date().getFullYear().toString(), description: '' });
      setIsEditing(false);
      setEditId(null);
    }
    setShowForm(!showForm);
  }, [showForm]);

  useEffect(() => {
    setHeaderAction(
      <button className={`add-btn ${showForm ? 'cancel' : ''}`} onClick={handleToggleForm}>
        {showForm ? <><X size={16}/> <span>Cancel</span></> : <><Plus size={16} /> <span>Define Exam Type</span></>}
      </button>
    );
    return () => setHeaderAction(null);
  }, [showForm, setHeaderAction, handleToggleForm]);

  const handleEdit = (type) => {
    setFormData({
      title: type.title,
      year: type.year,
      description: type.description || ''
    });
    setIsEditing(true);
    setEditId(type.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.year) return;
    setLocalLoading(true);
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'exam_types', editId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'exam_types'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setFormData({ title: '', year: new Date().getFullYear().toString(), description: '' });
      setIsEditing(false);
      setEditId(null);
      setShowForm(false);
    } catch (err) { alert(err.message); }
    setLocalLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("CRITICAL: Institutional category removal. This may impact historical performance archives for this specific cycle. Continue?")) return;
    try {
      await deleteDoc(doc(db, 'exam_types', id));
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="institutional-page">
      <Modal 
        isOpen={showForm} 
        onClose={handleToggleForm} 
        title={isEditing ? 'Modify Specification' : 'New Exam Specification'}
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Exam Title (e.g. Midterm 2029)</label>
              <div className="i-wrap"><BookOpen size={16}/><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Enter institutional title..." required /></div>
            </div>
            <div className="form-group">
              <label>Academic Year</label>
              <div className="i-wrap"><Calendar size={16}/><input type="text" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="e.g. 2026" required /></div>
            </div>
          </div>
          <div className="form-group full">
            <label>Institutional Scope / Description</label>
            <div className="i-wrap"><AlignLeft size={16}/><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Define assessment objectives and archival scope..." /></div>
          </div>
          <div className="modal-actions">
             <button type="button" className="cancel-btn" onClick={handleToggleForm}>Discard</button>
             <button type="submit" className="save-btn" disabled={loading}>{loading ? 'Syncing...' : (isEditing ? 'Save Modifications' : 'Register Exam Category')}</button>
          </div>
        </form>
      </Modal>

      <div className="list-container glass fadeIn">
         <div className="list-header">
            <div className="h-col main">Exam Category Details</div>
            <div className="h-col year">Cycle</div>
            <div className="h-col actions">Actions</div>
         </div>
         <div className="list-body">
            {examTypes.length === 0 ? (
              <div className="empty-row">No assessment categories registered.</div>
            ) : examTypes.map(type => (
              <div key={type.id} className="list-row">
                 <div className="r-col main">
                    <div className="r-avatar">{type.title.charAt(0)}</div>
                    <div className="r-info">
                       <h4>{type.title}</h4>
                       <p>{type.description || 'Instructional Assessment Phase'}</p>
                    </div>
                 </div>
                 <div className="r-col year">
                    <span className="year-pill">{type.year}</span>
                 </div>
                 <div className="r-col actions">
                    <button className="act-btn edit" onClick={() => handleEdit(type)} title="Edit Specification"><Pencil size={14}/></button>
                    <button className="act-btn del" onClick={() => handleDelete(type.id)} title="Delete Category"><Trash2 size={14}/></button>
                 </div>
              </div>
            ))}
         </div>
      </div>

      <style>{`
        .institutional-page { padding: 4px 16px; min-height: 100vh; }
        .page-header { margin-bottom: 24px; padding: 20px; background: white; border-radius: 16px; border: 1px solid #f1f5f9; }
        .title-area { display: flex; align-items: center; gap: 16px; }
        .title-area h1 { font-size: 1.25rem; color: #1e293b; margin-bottom: 2px; font-weight: 800; }
        .title-area p { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
        .p-icon { color: var(--primary); }


        .form-grid { display: flex; flex-direction: column; gap: 4px; }
        .i-wrap { position: relative; }
        .i-wrap svg { position: absolute; left: 14px; top: 14px; color: #cbd5e1; }
        .i-wrap input, .i-wrap textarea { width: 100%; padding: 12px 14px 12px 42px; border: 1.5px solid #e2e8f0; border-radius: 14px; font-size: 0.85rem; font-weight: 700; color: #334155; outline: none; background: #f8fafc; transition: 0.2s; }
        .i-wrap input:focus, .i-wrap textarea:focus { border-color: var(--primary); background: white; }
        .i-wrap textarea { min-height: 80px; padding-top: 14px; resize: none; }

        /* LIST DESIGN */
        .list-container { background: white; border-radius: 20px; border: 1px solid #f1f5f9; overflow: hidden; }
        .list-header { display: grid; grid-template-columns: 2fr 1fr 100px; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
        .h-col { font-size: 0.7rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .h-col.actions { text-align: right; }

        .list-body { 
          max-height: 65vh; 
          overflow-y: auto; 
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .list-body::-webkit-scrollbar { display: none; }

        .list-row { display: grid; grid-template-columns: 2fr 1fr 100px; padding: 16px 24px; border-bottom: 1px solid #f1f5f9; align-items: center; transition: 0.2s; cursor: default; }
        .list-row:last-child { border-bottom: none; }
        .list-row:hover { background: #fff1f2; }

        .r-col.main { display: flex; align-items: center; gap: 16px; }
        .r-avatar { width: 40px; height: 40px; border-radius: 12px; background: white; border: 1px solid #f1f5f9; color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .r-info h4 { font-size: 0.95rem; color: #1e293b; margin-bottom: 2px; font-weight: 800; }
        .r-info p { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }

        .year-pill { padding: 4px 12px; background: #f1f5f9; color: #64748b; border-radius: 20px; font-size: 0.65rem; font-weight: 900; }
        
        .r-col.actions { display: flex; gap: 8px; justify-content: flex-end; }
        .act-btn { padding: 8px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .act-btn.edit { background: #eff6ff; color: #2563eb; }
        .act-btn.del { background: #fff1f2; color: #e11d48; }
        .act-btn:hover { transform: scale(1.1); }

        .empty-row { padding: 40px; text-align: center; color: #94a3b8; font-weight: 600; font-size: 0.85rem; }

        @media (max-width: 600px) {
           .list-header { display: none; }
           .list-row { grid-template-columns: 1fr auto; gap: 12px; padding: 14px 16px; }
           .r-col.year { display: none; }
           .r-avatar { width: 32px; height: 32px; font-size: 0.9rem; }
           .r-info h4 { font-size: 0.85rem; }
           .r-info p { font-size: 0.7rem; }
        }

        .fadeIn { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ExamTypes;
