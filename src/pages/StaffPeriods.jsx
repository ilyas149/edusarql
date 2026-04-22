import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Clock, Save, X, Edit3, Loader2, CheckCircle2, ArrowRight, UserCheck } from 'lucide-react';
import { useHeader } from '../hooks/useHeader';
import { getRole, ROLES } from '../services/auth';
import { formatTime12h } from '../services/utils';
import Modal from '../components/Modal';


const StaffPeriods = () => {
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const { setHeaderAction } = useHeader();
  
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ name: '', startTime: '', endTime: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchPeriods = React.useCallback(async () => {
    setLoading(true);
    const q = query(collection(db, 'staff_periods'), orderBy('startTime', 'asc'));
    const snap = await getDocs(q);
    setPeriods(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  }, []);

  useEffect(() => { 
    Promise.resolve().then(() => fetchPeriods()); 
  }, [fetchPeriods]);

  useEffect(() => {
    if (isAdmin) {
      setHeaderAction(
        <button className="add-btn" onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', startTime: '', endTime: '' }); }}>
          <Plus size={16} />
          <span>Add Staff Period</span>
        </button>
      );
    }
    return () => setHeaderAction(null);
  }, [isAdmin, setHeaderAction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'staff_periods', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'staff_periods'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsAdding(false);
      fetchPeriods();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this staff period? This will affect staff attendance records.")) return;
    await deleteDoc(doc(db, 'staff_periods', id));
    fetchPeriods();
  };

  return (
    <div className="periods-page">
      {showSuccess && (
        <div className="success-toast glass">
           <CheckCircle2 size={18} color="#059669" />
           <span>Staff work schedule updated!</span>
        </div>
      )}

      <Modal 
        isOpen={isAdding} 
        onClose={() => setIsAdding(false)} 
        title={editingId ? 'Edit Staff Period' : 'New Staff Period'}
      >
         <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-body">
               <div className="input-field">
                  <label>Staff Session Name</label>
                  <input 
                    required 
                    placeholder="e.g. Morning Shift" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
               </div>
               <div className="time-grid">
                  <div className="input-field">
                     <label>Start Time</label>
                     <input 
                       type="time" 
                       required 
                       value={formData.startTime} 
                       onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                     />
                  </div>
                  <div className="input-field">
                     <label>End Time</label>
                     <input 
                       type="time" 
                       required 
                       value={formData.endTime} 
                       onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                     />
                  </div>
               </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="save-btn" disabled={loading}>
                 {loading ? <Loader2 className="spin" size={18}/> : <Save size={18}/>}
                 <span>{editingId ? 'Save Changes' : 'Create Session'}</span>
              </button>
            </div>
         </form>
      </Modal>

      {loading && !isAdding ? (
         <div className="loader">Loading Staff Schedules...</div>
      ) : (
        <div className="periods-list-container glass">
           <div className="list-columns">
              <div className="c-label">Session Title</div>
              <div className="c-time">Work Hours</div>
              {isAdmin && <div className="c-mgmt">Actions</div>}
           </div>
           
           <div className="list-container-body">
              {periods.length === 0 ? (
                <div className="empty-state">No staff work sessions defined.</div>
              ) : (
                periods.map(p => (
                  <div key={p.id} className="period-row">
                     <div className="p-identity">
                        <div className="p-pill staff">{p.name}</div>
                     </div>
                     <div className="p-temporal">
                        <span className="t-time start">{formatTime12h(p.startTime)}</span>
                        <ArrowRight size={14} className="t-arrow" />
                        <span className="t-time end">{formatTime12h(p.endTime)}</span>
                     </div>
                     {isAdmin && (
                       <div className="p-mgmt">
                          <button className="row-action edit" onClick={() => { setEditingId(p.id); setFormData({ name: p.name, startTime: p.startTime, endTime: p.endTime }); setIsAdding(true); }}>
                             <Edit3 size={14} />
                          </button>
                          <button className="row-action delete" onClick={() => handleDelete(p.id)}>
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

      <style>{`
        .p-pill.staff { background: #eff6ff; color: #2563eb; }
        /* Reusing styles from Periods.jsx through inheritance or identical classes */
      `}</style>
    </div>
  );
};

export default StaffPeriods;
