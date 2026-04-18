import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '../services/firebase';
import {
  collection, getDocs, addDoc, serverTimestamp, query, where,
  doc, updateDoc, getDoc, setDoc, deleteDoc
} from 'firebase/firestore';
import {
  Plus, GraduationCap, ChevronRight, ArrowLeft, ArrowRight,
  User, BookOpen, Layers, CheckCircle2, Search, Calendar,
  Trophy, AlignLeft, Filter, Save, AlertCircle, Edit3, Loader2,
  Settings2, Trash2, Pencil, X, ChevronLeft
} from 'lucide-react';
import { useHeader } from '../hooks/useHeader';
import { getRole, ROLES } from '../services/auth';

const Exams = () => {
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const { setHeaderAction, setHeaderTitle, setBackAction } = useHeader();
  const scrollRef = useRef(null);

  const [view, setView] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const [examTypes, setExamTypes] = useState([]);
  const [exams, setExams] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drag-to-Scroll Logic States
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Modal/Form States
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [newSession, setNewSession] = useState({ batchId: '', subjectConfigs: {} });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const typeSnap = await getDocs(query(collection(db, 'exam_types'), where('year', '==', selectedYear)));
      setExamTypes(typeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const batchSnap = await getDocs(collection(db, 'batches'));
      setBatches(batchSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const subSnap = await getDocs(collection(db, 'subjects'));
      setSubjects(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [selectedYear]);

  const fetchSessions = useCallback(async () => {
    if (!selectedType) return;
    const q = query(collection(db, 'exams'), where('examTypeId', '==', selectedType.id));
    const snap = await getDocs(q);
    setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, [selectedType]);

  const handleOpenAdd = useCallback(() => {
    setNewSession({ batchId: '', subjectConfigs: {} });
    setIsEditingSession(false);
    setEditingSessionId(null);
    setShowAddBatch(true);
  }, []);

  const handleSaveMarks = useCallback(async () => {
    if (!selectedSession) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'marks', selectedSession.id);
      await setDoc(docRef, {
        examId: selectedSession.id,
        records: marksData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      const updatedSnap = await getDoc(docRef);
      if (updatedSnap.exists()) setMarksData(updatedSnap.data().records);
      setIsRecording(false);
      alert("Institutional performance records archived successfully.");
    } catch (err) { alert(err.message); }
    setSaving(false);
  }, [selectedSession, marksData]);

  useEffect(() => { 
    Promise.resolve().then(() => fetchData()); 
  }, [fetchData]);

  useEffect(() => {
    if (view === 'type_detail' && selectedType) {
      Promise.resolve().then(() => fetchSessions());
    }
  }, [view, selectedType, fetchSessions]);

  useEffect(() => {
    if (view === 'marks_entry' && selectedSession) {
      (async () => {
        setLoading(true);
        const q = query(collection(db, 'students'), where('batchId', '==', selectedSession.batchId));
        const snap = await getDocs(q);
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const markSnap = await getDoc(doc(db, 'marks', selectedSession.id));
        setMarksData(markSnap.exists() ? markSnap.data().records : {});
        setLoading(false);
      })();
    } else {
      Promise.resolve().then(() => setIsRecording(false));
    }
  }, [view, selectedSession]);

  useEffect(() => {
    if (view === 'marks_entry' && selectedSession && selectedType) {
      const bName = batches.find(b => b.id === selectedSession.batchId)?.batchName || '';
      setHeaderTitle(`${bName} Performance`);
      setBackAction(
        <button className="back-round-btn" onClick={() => setView('type_detail')} title="Back">
          <ChevronLeft size={20} />
        </button>
      );
      setHeaderAction(
        <div className="header-actions-group">
          {isRecording ? (
            <button className="header-icon-btn save" onClick={handleSaveMarks} disabled={saving} title="Apply Records">
              {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            </button>
          ) : isAdmin && (
            <button className="header-icon-btn edit" onClick={() => setIsRecording(true)} title="Engage Recording">
              <Edit3 size={18} />
            </button>
          )}
        </div>
      );
    } else if (view === 'type_detail' && selectedType) {
       setHeaderTitle(selectedType.title);
       setBackAction(
         <button className="back-round-btn" onClick={() => setView('overview')} title="Back">
           <ChevronLeft size={20} />
         </button>
       );
       setHeaderAction(
         <div className="header-actions-group">
           {isAdmin && <button className="header-icon-btn add" onClick={handleOpenAdd} title="Register Batch Participation"><Plus size={18} /></button>}
         </div>
       );
    } else {
      setHeaderTitle(null); 
      setBackAction(null);
      setHeaderAction(
        <div className="header-actions-group">
          <div className="year-selector">
            <Calendar size={16} />
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      );
    }
    return () => { 
      setHeaderAction(null); 
      setHeaderTitle(null); 
      setBackAction(null);
    };
  }, [view, selectedSession, selectedType, isRecording, saving, batches, selectedYear, marksData, setHeaderAction, setHeaderTitle, setBackAction, handleSaveMarks, isAdmin, handleOpenAdd]);

  const displayStudents = useMemo(() => {
    if (!selectedSession || !students.length) return [];
    
    const data = students.map(s => {
      const m = marksData[s.id] || {};
      let total = 0;
      let max = 0;
      selectedSession.subjects.forEach(sub => {
        total += parseFloat(m[sub.name] || 0);
        max += parseFloat(sub.totalMark || 0);
      });
      return { ...s, totalObtained: total, totalMax: max, hasMark: Object.keys(m).length > 0 };
    });

    if (isRecording) {
      return data.sort((a, b) => a.name.localeCompare(b.name));
    }
    return data.sort((a, b) => b.totalObtained - a.totalObtained);
  }, [students, marksData, isRecording, selectedSession]);

  // Drag-to-Scroll Handlers
  const handleMouseDown = useCallback((e) => {
    if (isRecording) return; 
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, [isRecording]);

  const handleMouseLeave = useCallback(() => setIsDragging(false), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    scrollRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const updateMark = (studentId, subjectId, val) => {
    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [subjectId]: val }
    }));
  };

  const toggleSubject = (name) => {
    setNewSession(prev => {
      const configs = { ...prev.subjectConfigs };
      if (configs[name]) delete configs[name];
      else configs[name] = '100';
      return { ...prev, subjectConfigs: configs };
    });
  };

  const updateTotalMark = (name, val) => {
    setNewSession(prev => ({
      ...prev,
      subjectConfigs: { ...prev.subjectConfigs, [name]: val }
    }));
  };

  const handleOpenEdit = (e, session) => {
    e.stopPropagation();
    const configs = {};
    session.subjects.forEach(s => { configs[s.name] = s.totalMark; });
    setNewSession({ batchId: session.batchId, subjectConfigs: configs });
    setIsEditingSession(true);
    setEditingSessionId(session.id);
    setShowAddBatch(true);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("CRITICAL ACTION: Archive destruction requested. All performance records for this batch session will be permanently deleted. Continue?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'exams', sessionId));
      await deleteDoc(doc(db, 'marks', sessionId));
      fetchSessions();
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  const handleFinalizeSession = async () => {
    if (!newSession.batchId || Object.keys(newSession.subjectConfigs).length === 0) return;
    setLoading(true);
    try {
      const subjectArray = Object.entries(newSession.subjectConfigs).map(([name, total]) => ({
        name,
        totalMark: total || '100'
      }));
      const data = {
        examTypeId: selectedType.id,
        batchId: newSession.batchId,
        subjects: subjectArray,
        year: selectedYear,
        updatedAt: serverTimestamp()
      };
      if (isEditingSession) {
        await updateDoc(doc(db, 'exams', editingSessionId), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'exams'), data);
      }
      setShowAddBatch(false);
      fetchSessions();
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  return (
    <div className="exams-premium-page">
      {view === 'overview' && (
        <div className="overview-container fadeIn">
          <div className="sec-intro"><Trophy size={40} className="sec-icon" /><div><h1>Academic Assessment Matrix {selectedYear}</h1><p>Select an institutional exam category to manage batch participation and performance records.</p></div></div>
          <div className="type-grid">
            {examTypes.length === 0 ? (
              <div className="empty-state glass"><AlertCircle size={40} /><h3>No Assessment Categories</h3><p>Define institutional exam types in the Admin Management section to begin.</p></div>
            ) : examTypes.map(type => (
              <div key={type.id} className="type-card glass" onClick={() => { setSelectedType(type); setView('type_detail'); }}>
                <div className="card-ornament"><GraduationCap size={24} /></div>
                <div className="card-info"><h3>{type.title}</h3><p>{type.description || 'Institutional Assessment Cycle'}</p></div>
                <ChevronRight size={20} className="arrow-icon" />
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'type_detail' && selectedType && (
        <div className="type-detail-container fadeIn">
          {showAddBatch && (
            <div className="action-modal glass fadeIn">
              <h3><Layers size={18} /> {isEditingSession ? 'Modify Academic Participation' : 'New Batch Participation'}</h3>
              <div className="m-group">
                <label>Institutional Batch</label>
                <select value={newSession.batchId} onChange={(e) => setNewSession({ ...newSession, batchId: e.target.value })} disabled={isEditingSession}>
                  <option value="">Choose Batch...</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
                </select>
              </div>
              <div className="m-group">
                <label>Instructional Subject Strategy</label>
                <div className="config-grid hide-scrollbar">
                  {subjects.map(s => {
                    const isSel = !!newSession.subjectConfigs[s.name];
                    return (
                      <div key={s.id} className={`config-row ${isSel ? 'active' : ''}`}>
                        <div className="row-main" onClick={() => toggleSubject(s.name)}>
                          <div className={`c-icon-wrap ${isSel ? 'active' : ''}`}>{isSel ? <CheckCircle2 size={16} /> : <div className="c-empty" />}</div>
                          <span className="sub-name-txt">{s.name}</span>
                        </div>
                        {isSel && (
                          <div className="row-total anim-slide-left">
                            <span className="m-label">Max:</span>
                            <input type="text" value={newSession.subjectConfigs[s.name]} onChange={(e) => updateTotalMark(s.name, e.target.value)} placeholder="100" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button className="m-btn cancel" onClick={() => setShowAddBatch(false)}>Cancel</button>
                <button className="m-btn finalize" onClick={handleFinalizeSession} disabled={loading}>{loading ? 'Syncing...' : (isEditingSession ? 'Save Changes' : 'Finalize Participation')}</button>
              </div>
            </div>
          )}

          <div className="session-list">
            <h2>Registered Batch Participation</h2>
            <div className="session-grid">
              {exams.map(ex => (
                <div key={ex.id} className="session-card glass" onClick={() => { setSelectedSession(ex); setView('marks_entry'); }}>
                  <div className="s-icon"><Layers size={20} /></div>
                  <div className="s-info"><h4>{batches.find(b => b.id === ex.batchId)?.batchName || 'Unknown Batch'}</h4><div className="s-subs"><BookOpen size={12} /> {ex.subjects.length} Subjects</div></div>
                  {isAdmin && (
                    <div className="s-actions">
                      <button className="s-act-btn edit" onClick={(e) => handleOpenEdit(e, ex)} title="Edit Configuration"><Pencil size={14} /></button>
                      <button className="s-act-btn del" onClick={(e) => handleDeleteSession(e, ex.id)} title="Delete Record"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'marks_entry' && selectedSession && (
        <div className="marks-entry-container fadeIn">
          {!isRecording && (
            <div className="merit-topbar fadeIn">
              <div className="merit-strip">
                {(() => {
                  const ranked = students.map(s => {
                    const marks = marksData[s.id] || {};
                    let total = 0;
                    let max = 0;
                    selectedSession.subjects.forEach(sub => {
                      total += parseFloat(marks[sub.name] || 0);
                      max += parseFloat(sub.totalMark || 0);
                    });
                    return { name: s.name, total, max, pct: max > 0 ? Math.round((total / max) * 100) : 0, hasMark: Object.keys(marks).length > 0 };
                  })
                    .filter(st => st.hasMark)
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 3);

                  const labels = ["1st", "2nd", "3rd"];
                  if (ranked.length === 0) return null;

                  return ranked.map((st, i) => (
                    <div key={i} className={`merit-tile rank-${i + 1}`}>
                      <span className="merit-rank">{labels[i]}</span>
                      <span className="merit-name">{st.name}</span>
                      <span className="merit-score">{st.total} <small>/ {st.max}</small></span>
                      <span className="merit-pct">{st.pct}%</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          <div className="marks-table-wrapper glass">
            <div
              className={`table-responsive ${isDragging ? 'dragging' : ''}`}
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
              <table className="premium-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Student Identity</th>
                    {selectedSession.subjects.map(sub => (<th key={sub.name} className="sub-th"><div className="th-name">{sub.name}</div><div className="th-total">/ {sub.totalMark}</div></th>))}
                    <th className="summary-th">Total</th>
                    <th className="summary-th">%</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStudents.map(s => {
                    const studentMarks = marksData[s.id] || {};
                    const rowPct = s.totalMax > 0 ? Math.round((s.totalObtained / s.totalMax) * 100) : 0;
                    
                    return (
                      <tr key={s.id}>
                        <td className="sticky-col s-identity"><div className="s-avatar">{s.name.charAt(0)}</div><span>{s.name}</span></td>
                        {selectedSession.subjects.map(sub => {
                          const mark = studentMarks[sub.name];
                          return (
                            <td key={sub.name}>
                              {isRecording ? (
                                <input 
                                  type="text" 
                                  className="mark-input" 
                                  value={mark || ''} 
                                  onChange={(e) => updateMark(s.id, sub.name, e.target.value)} 
                                  placeholder="--" 
                                />
                              ) : (
                                <span className={`mark-display ${!mark ? 'dim' : ''}`}>{mark || '--'}</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="total-cell">
                          <span className={`row-total-txt ${!s.hasMark ? 'dim' : ''}`}>{s.totalObtained}</span>
                          <span className="row-max-txt">/ {s.totalMax}</span>
                        </td>
                        <td className="pct-cell">
                          <div className={`row-pct-pill ${!s.hasMark ? 'dim' : ''}`}>{rowPct}%</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .exams-premium-page { padding: 4px 0px; min-height: 100vh; position: relative; }
        .sec-intro { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; padding: 20px; }
        .sec-icon { color: var(--primary); }
        .sec-intro h1 { font-size: 1.5rem; color: #1e293b; margin-bottom: 4px; }
        .sec-intro p { color: #64748b; font-size: 0.9rem; }
        .year-selector { display: flex; align-items: center; gap: 10px; background: white; padding: 6px 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; }
        .year-selector select { border: none; font-weight: 800; color: var(--primary); outline: none; background: none; }
        
        .type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .type-card { background: white; padding: 24px; border-radius: 20px; display: flex; align-items: center; gap: 20px; cursor: pointer; transition: all 0.2s; border: 1px solid #f1f5f9; }
        .type-card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 10px 40px rgba(244, 63, 94, 0.08); }
        .card-ornament { width: 56px; height: 56px; border-radius: 16px; background: #fff1f2; color: var(--primary); display: flex; align-items: center; justify-content: center; }
        .card-info h3 { font-size: 1.1rem; color: #1e293b; margin-bottom: 4px; }
        .card-info p { font-size: 0.8rem; color: #94a3b8; }
        .arrow-icon { color: #cbd5e1; margin-left: auto; }

        .action-modal { 
          position: fixed !important; 
          top: 50% !important; 
          left: 50% !important; 
          transform: translate(-50%, -50%) !important; 
          width: 90% !important; 
          max-width: 480px !important; 
          background: white !important; 
          padding: 28px !important; 
          border-radius: 20px !important; 
          border: 1px solid #e2e8f0 !important; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important; 
          z-index: 1000 !important; 
          max-height: 90vh;
          overflow-y: auto;
        }

        .exams-premium-page::after {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          z-index: 900;
          display: ${showAddBatch ? 'block' : 'none'};
        }

        .m-group { margin-bottom: 20px !important; }
        .m-group label { display: block !important; font-size: 0.7rem !important; font-weight: 800 !important; color: #94a3b8 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; margin-bottom: 6px !important; }
        .m-group select { width: 100% !important; padding: 10px 14px !important; border-radius: 10px !important; border: 1.5px solid #e2e8f0 !important; background: #f8fafc !important; font-weight: 700 !important; color: #334155 !important; font-size: 0.9rem !important; outline: none; transition: 0.2s; }
        .m-group select:focus { border-color: var(--primary); background: white; }

        .config-grid { display: flex !important; flex-direction: column !important; gap: 8px !important; padding: 4px 0 !important; }
        .config-row { display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 8px 14px !important; border-radius: 12px !important; border: 1px solid #f1f5f9 !important; background: #fcfcfc !important; }
        .config-row.active { border-color: var(--primary) !important; background: #fff1f2 !important; }
        .row-main { display: flex !important; align-items: center !important; gap: 12px !important; cursor: pointer !important; }
        .c-icon-wrap { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid #cbd5e1; display: flex; align-items: center; justify-content: center; }
        .c-icon-wrap.active { border-color: var(--primary); background: var(--primary); color: white; }
        .sub-name-txt { font-weight: 700 !important; font-size: 0.8rem !important; color: #334155 !important; }
        .row-total { display: flex !important; align-items: center !important; gap: 8px !important; }
        .m-label { font-size: 0.55rem !important; font-weight: 800 !important; color: #94a3b8 !important; }
        .row-total input { width: 55px !important; padding: 5px !important; border-radius: 6px !important; border: 1.5px solid #e2e8f0 !important; text-align: center !important; font-weight: 800 !important; color: var(--primary) !important; font-size: 0.8rem !important; outline: none; }

        .modal-actions { display: flex !important; gap: 12px !important; margin-top: 24px !important; pt-0 !important; border: none !important; }
        .m-btn { flex: 1 !important; padding: 12px !important; border-radius: 10px !important; font-weight: 800 !important; font-size: 0.85rem !important; cursor: pointer !important; border: none !important; }
        .m-btn.cancel { background: #f1f5f9 !important; color: #64748b !important; }
        .m-btn.finalize { background: var(--primary) !important; color: white !important; }

        .session-list h2 { font-size: 1rem; color: #64748b; text-transform: uppercase; margin-bottom: 20px; }
        .session-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .session-card { background: white; padding: 16px; border-radius: 16px; border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: 0.2s; position: relative; }
        .session-card:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .s-icon { width: 44px; height: 44px; border-radius: 12px; background: #f8fafc; color: #64748b; display: flex; align-items: center; justify-content: center; }
        .s-info h4 { font-size: 0.95rem; color: #1e293b; margin-bottom: 2px; }
        .s-subs { font-size: 0.7rem; color: #94a3b8; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        
        .s-actions { display: flex; gap: 8px; margin-left: auto; }
        .s-act-btn { padding: 8px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .s-act-btn.edit { background: #eff6ff; color: #2563eb; }
        .s-act-btn.del { background: #fff1f2; color: #e11d48; }
        .s-act-btn:hover { transform: scale(1.1); }

        .marks-table-wrapper { border-radius: 20px; background: white; overflow: hidden; border: 1px solid #f1f5f9; }
        .table-responsive { overflow-x: auto; width: 100%; cursor: grab; user-select: none; position: relative; }
        .table-responsive.dragging { cursor: grabbing; scroll-behavior: auto; }
        .premium-table { width: max-content; min-width: 100%; border-collapse: collapse; pointer-events: auto; }
        .premium-table th, .premium-table td { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; text-align: center; }
        
        .table-responsive::-webkit-scrollbar { height: 6px; }
        .table-responsive::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .table-responsive::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 1px solid #f8fafc; }
        .table-responsive::-webkit-scrollbar-thumb:hover { background: var(--primary); }

        .sub-th { min-width: 140px; }
        .th-name { font-size: 0.8rem; font-weight: 800; color: #1e293b; text-transform: uppercase; }
        .th-total { font-size: 0.65rem; color: #94a3b8; font-weight: 900; margin-top: 2px; }

        .sticky-col { position: sticky !important; left: 0; background: #f8fafc !important; z-index: 20; border-right: 2.5px solid #f1f5f9; text-align: left !important; box-shadow: 10px 0 15px -10px rgba(0,0,0,0.05); }
        tbody .sticky-col { background: white !important; }
        .s-identity { display: flex; align-items: center; gap: 12px; min-width: 220px; }
        .s-identity span { font-weight: 700; color: #1e293b; font-size: 0.85rem; }
        .s-avatar { width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.8rem; }
        
        .mark-input { width: 70px; height: 40px; border-radius: 10px; border: 1.5px solid #e2e8f0; text-align: center; font-weight: 800; color: var(--primary); outline: none; background: #fcfcfc; }
        .mark-input:focus { border-color: var(--primary); background: #fff1f2; transform: scale(1.05); }
        .mark-display { font-weight: 800; color: var(--primary); font-size: 0.95rem; }
        .mark-display.dim { color: #cbd5e1; font-weight: 400; }

        .summary-th { background: #f8fafc !important; border-left: 2px solid #e2e8f0; color: #64748b !important; }
        .total-cell { background: #fcfcfc; border-left: 2px solid #f1f5f9; text-align: center; }
        .row-total-txt { font-weight: 900; color: #1e293b; font-size: 1rem; }
        .row-total-txt.dim { color: #cbd5e1; font-weight: 400; }
        .row-max-txt { font-size: 0.65rem; color: #94a3b8; font-weight: 800; margin-left: 4px; }
        
        .pct-cell { text-align: center; }
        .row-pct-pill { display: inline-block; padding: 4px 10px; border-radius: 8px; background: #1e293b; color: white; font-size: 0.75rem; font-weight: 800; }
        .row-pct-pill.dim { background: #f1f5f9; color: #94a3b8; font-weight: 400; }

        .merit-topbar { margin-bottom: 20px; }
        .merit-strip { display: flex; gap: 12px; flex-wrap: wrap; }
        .merit-tile { flex: 1; min-width: 200px; padding: 10px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; background: white; border: 1.5px solid #f1f5f9; transition: 0.2s; }
        .merit-tile:hover { transform: translateY(-3px); border-color: var(--primary); box-shadow: 0 8px 20px -10px rgba(0,0,0,0.08); }
        
        .merit-rank { font-size: 0.75rem; font-weight: 900; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
        .rank-1 .merit-rank { background: #fef3c7; color: #b45309; }
        .rank-2 .merit-rank { background: #f1f5f9; color: #475569; }
        .rank-3 .merit-rank { background: #fff7ed; color: #9a3412; }
        
        .merit-name { font-size: 0.9rem; font-weight: 800; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .merit-score { font-size: 0.85rem; font-weight: 700; color: #64748b; }
        .merit-score small { font-size: 0.65rem; color: #94a3b8; font-weight: 400; }
        .merit-pct { font-size: 0.85rem; font-weight: 900; color: var(--primary); background: #fff1f2; padding: 4px 8px; border-radius: 6px; }

        .fadeIn { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default Exams;
