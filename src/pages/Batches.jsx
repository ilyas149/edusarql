import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Layers, Users, ShieldCheck, Edit2, ChevronLeft } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getRole, ROLES } from '../services/auth';
import { useHeader } from '../hooks/useHeader';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

import { useData } from '../context/DataContext';

const Batches = () => {
  const navigate = useNavigate();
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const { setHeaderAction, setBackAction } = useHeader();
  const { batches, teachers, students, loading: contextLoading } = useData();
  const loading = contextLoading.batches || contextLoading.teachers || contextLoading.students;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newBatch, setNewBatch] = useState({ name: '', teacherId: '' });

  const [viewingBatchId, setViewingBatchId] = useState(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (viewingBatchId) {
        setBackAction(
          <button className="back-round-btn" onClick={() => setViewingBatchId(null)} title="Back">
            <ChevronLeft size={20} />
          </button>
        );
        setHeaderAction(null);
      } else {
        setBackAction(null);
        if (isAdmin) {
          setHeaderAction(
            <button className="add-btn" onClick={() => { setIsEditMode(false); setNewBatch({ name: '', teacherId: '' }); setIsModalOpen(true); }}>
              <Plus size={16} />
              <span>New Batch</span>
            </button>
          );
        } else {
          setHeaderAction(null);
        }
      }
    });

    return () => {
      setHeaderAction(null);
      setBackAction(null);
    };
  }, [isAdmin, setHeaderAction, setBackAction, viewingBatchId]);

  // Derive counts reactively
  const studentCounts = useMemo(() => {
    const counts = {};
    students.forEach(s => {
      if (s.batchId) counts[s.batchId] = (counts[s.batchId] || 0) + 1;
    });
    return counts;
  }, [students]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newBatch.name) return;
    try {
      if (isEditMode) {
        await updateDoc(doc(db, 'batches', editingId), {
          batchName: newBatch.name,
          teacherId: newBatch.teacherId
        });
      } else {
        await addDoc(collection(db, 'batches'), { 
          batchName: newBatch.name,
          teacherId: newBatch.teacherId 
        });
      }
      setNewBatch({ name: '', teacherId: '' });
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClick = (e, batch) => {
    e.stopPropagation();
    setNewBatch({ name: batch.batchName, teacherId: batch.teacherId || '' });
    setEditingId(batch.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  if (loading) return <div className="loader">Loading Batches...</div>;

  if (viewingBatchId) {
    const selectedBatch = batches.find(b => b.id === viewingBatchId);
    const batchStudents = students.filter(s => s.batchId === viewingBatchId);
    const teacher = teachers.find(t => t.id === selectedBatch?.teacherId);

    return (
      <div className="batches-page">
        <div className="batch-detail-header glass">
          <div className="batch-header-main-row">
            <div className="batch-info-mini">
               <h2 className="title-inline">{selectedBatch?.batchName}</h2>
               <div className="teacher-tag-inline">
                  <ShieldCheck size={13} />
                  <span>{teacher ? teacher.name : 'No Teacher'}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="batch-students-container">
           <div className="list-stats">
              <span>Showing {batchStudents.length} Students</span>
           </div>
           
           <div className="cards-grid">
             {batchStudents.length > 0 ? batchStudents.map(student => (
               <div key={student.id} className="compact-card" onClick={() => navigate(`/dashboard/students/${student.id}`)}>
                 <div className="avatar-mini">
                   {student.avatarUrl ? <img src={student.avatarUrl} alt="" /> : student.name.charAt(0)}
                 </div>
                 <div className="card-info">
                   <span className="card-name">{student.name}</span>
                   <span className="card-sub">{[student.houseName, student.place].filter(Boolean).join(', ') || 'No Address'}</span>
                   <div className="card-tag">Student</div>
                 </div>
               </div>
             )) : (
               <div className="empty-state-compact">No students found in this batch.</div>
             )}
           </div>
        </div>
        
        <style>{`
          .batch-detail-header {
            margin-bottom: 12px;
            padding: 8px 16px;
            border-radius: 10px;
          }
          .batch-header-main-row {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .batch-info-mini {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .title-inline {
            font-size: 1rem;
            margin: 0;
            color: var(--text-main);
          }
          .teacher-tag-inline {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.75rem;
            color: var(--text-dim);
            background: #fff5f5;
            padding: 2px 8px;
            border-radius: 20px;
            border: 1px solid var(--border-color);
          }
          .list-stats {
            margin-bottom: 10px;
            font-size: 0.65rem;
            font-weight: 700;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .empty-state-compact {
            text-align: center;
            padding: 40px;
            color: var(--text-dim);
            font-style: italic;
            background: white;
            border-radius: 10px;
            border: 1px dashed var(--border-color);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="batches-page">
      <div className="batches-grid">
        {batches.map(batch => {
          const teacher = teachers.find(t => t.id === batch.teacherId);
          return (
            <div 
              key={batch.id} 
              className="batch-card-inline glass"
              onClick={() => setViewingBatchId(batch.id)}
            >
              <div className="batch-prime-icon">
                <Layers size={26} />
              </div>
              
              <div className="batch-main-data">
                <h3>{batch.batchName}</h3>
                <div className="batch-meta-info">
                  <div className="meta-item">
                    <Users size={12} />
                    <span>{studentCounts[batch.id] || 0} Students</span>
                  </div>
                  <div className="meta-item teacher-tag">
                    <ShieldCheck size={12} />
                    <span>{teacher ? teacher.name : 'No Teacher'}</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="batch-actions-right">
                  <button className="corner-action-btn edit" onClick={(e) => handleEditClick(e, batch)}>
                    <Edit2 size={15} />
                  </button>
                  <button className="corner-action-btn delete" onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this batch?")) {
                      await deleteDoc(doc(db, 'batches', batch.id));
                    }
                  }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Batch" : "New Batch"}>
        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            <div className="form-group">
              <label>Batch Name</label>
              <input 
                value={newBatch.name} 
                onChange={(e) => setNewBatch({...newBatch, name: e.target.value})} 
                placeholder="e.g. Science 2024"
                required 
              />
            </div>
            <div className="form-group">
              <label>Assign Batch Teacher</label>
              <select 
                value={newBatch.teacherId} 
                onChange={(e) => setNewBatch({...newBatch, teacherId: e.target.value})}
              >
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="save-btn">{isEditMode ? 'Save Changes' : 'Create'}</button>
          </div>
        </form>
      </Modal>

        <style>{`
          .batches-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 12px;
            padding: 4px;
          }
          .batch-card-inline {
            background: white;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 14px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.2s ease;
            position: relative;
            cursor: pointer;
          }
          .batch-card-inline:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border-color: var(--primary);
          }
          .batch-prime-icon {
            width: 52px;
            height: 52px;
            background: #fff1f2;
            color: var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            flex-shrink: 0;
          }
          .batch-main-data {
            flex: 1;
            min-width: 0;
          }
          .batch-main-data h3 {
            font-size: 1.05rem;
            font-weight: 700;
            margin-bottom: 3px;
            color: var(--text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .batch-meta-info {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }
          .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.7rem;
            color: var(--text-dim);
          }
          .teacher-tag {
            color: var(--primary);
            font-weight: 600;
          }
          .batch-actions-right {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .corner-action-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-dim);
            border-radius: 6px;
            transition: var(--transition);
          }
          .corner-action-btn:hover {
            background: #f1f5f9;
            color: var(--primary);
          }
          .corner-action-btn.delete:hover {
            color: #ef4444;
            background: #fef2f2;
          }
        `}</style>
    </div>
  );
};

export default Batches;
