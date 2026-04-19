import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Clock, Save, X, Edit3, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useHeader } from '../hooks/useHeader';
import { getRole, ROLES } from '../services/auth';
import Modal from '../components/Modal';

const Periods = () => {
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
    const q = query(collection(db, 'periods'), orderBy('startTime', 'asc'));
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
          <span>Define Period Slot</span>
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
        await updateDoc(doc(db, 'periods', editingId), {
          ...formData,
          order: parseInt(formData.name.replace(/\D/g, '')) || 0,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'periods'), {
          ...formData,
          order: parseInt(formData.name.replace(/\D/g, '')) || 0,
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
    if (!window.confirm("Delete this period slot? This will affect all institutional timetables.")) return;
    await deleteDoc(doc(db, 'periods', id));
    fetchPeriods();
  };

  return (
    <div className="periods-page">
      {showSuccess && (
        <div className="success-toast glass">
           <CheckCircle2 size={18} color="#059669" />
           <span>Institutional cycle configuration secured!</span>
        </div>
      )}

      <Modal 
        isOpen={isAdding} 
        onClose={() => setIsAdding(false)} 
        title={editingId ? 'Edit Period Definition' : 'New Period Definition'}
      >
         <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-body">
               <div className="input-field">
                  <label>Period Identifier</label>
                  <input 
                    required 
                    placeholder="e.g. Period 1" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
               </div>
               <div className="time-grid">
                  <div className="input-field">
                     <label>Commencement</label>
                     <input 
                       type="time" 
                       required 
                       value={formData.startTime} 
                       onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                     />
                  </div>
                  <div className="input-field">
                     <label>Conclusion</label>
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
                 <span>{editingId ? 'Secure Update' : 'Initialize Period'}</span>
              </button>
            </div>
         </form>
      </Modal>

      {loading && !isAdding ? (
         <div className="loader">Hydrating Temporal Data...</div>
      ) : (
        <div className="periods-list-container glass">
           <div className="list-columns">
              <div className="c-label">Period Name</div>
              <div className="c-time">Temporal Range (Start - End)</div>
              {isAdmin && <div className="c-mgmt">Management</div>}
           </div>
           
           <div className="list-container-body">
              {periods.length === 0 ? (
                <div className="empty-state">No instructional cycles defined.</div>
              ) : (
                periods.map(p => (
                  <div key={p.id} className="period-row">
                     <div className="p-identity">
                        <div className="p-pill">{p.name}</div>
                     </div>
                     <div className="p-temporal">
                        <span className="t-time start">{p.startTime}</span>
                        <ArrowRight size={14} className="t-arrow" />
                        <span className="t-time end">{p.endTime}</span>
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
        .periods-page { padding: 20px; max-width: 1000px; margin: 0 auto; }
        .page-intro { margin-bottom: 24px; }
        .page-intro h1 { font-size: 1.4rem; color: #1e293b; display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .p-icon { color: var(--primary); }
        .page-intro p { font-size: 0.85rem; color: #64748b; }

        .periods-list-container { border-radius: 12px; overflow: hidden; background: white; border: 1px solid #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        
        .list-columns { display: grid; grid-template-columns: 1fr 2fr 100px; padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .c-mgmt { text-align: right; }

        .list-container-body { }
        .period-row { display: grid; grid-template-columns: 1fr 2fr 100px; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f8fafc; transition: background 0.15s; }
        .period-row:hover { background: #fffcfc; }
        .period-row:last-child { border-bottom: none; }

        .p-identity { }
        .p-pill { width: fit-content; background: #fff1f2; color: var(--primary); padding: 4px 14px; border-radius: 20px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; }

        .p-temporal { display: flex; align-items: center; gap: 16px; }
        .t-time { font-size: 1rem; font-weight: 700; color: #334155; }
        .t-time.start { color: var(--primary); }
        .t-arrow { color: #cbd5e1; }
        .t-time.end { color: #64748b; }

        .p-mgmt { display: flex; gap: 8px; justify-content: flex-end; }
        .row-action { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #f1f5f9; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #94a3b8; }
        .row-action.edit:hover { color: var(--primary); border-color: var(--primary); background: #fff1f2; }
        .row-action.delete:hover { color: #ef4444; border-color: #ef4444; background: #fef2f2; }


        .form-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
        .input-field { display: flex; flex-direction: column; gap: 6px; }
        .input-field label { font-size: 0.75rem; font-weight: 700; color: #64748b; }
        .input-field input { padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-weight: 600; outline: none; }
        .time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .empty-state { text-align: center; padding: 60px; color: #cbd5e1; font-weight: 600; font-style: italic; }

        @media (max-width: 600px) {
           .list-columns { display: none; }
           .period-row { grid-template-columns: 1fr auto auto; gap: 8px; padding: 12px 12px; }
           .p-temporal { flex-direction: row; align-items: center; gap: 4px; }
           .t-time { font-size: 0.75rem; font-weight: 800; }
           .t-arrow { display: block; width: 10px; height: 10px; opacity: 0.5; }
           .p-mgmt { gap: 4px; }
           .row-action { width: 28px; height: 28px; }
        }
      `}</style>
    </div>
  );
};

export default Periods;
