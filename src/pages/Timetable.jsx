import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import {
  Edit2, Save, Calendar, MinusCircle, PlusCircle,
  CheckCircle2, LayoutGrid, ArrowLeft, Trash2, Info, User, ChevronLeft
} from 'lucide-react';
import { useHeader } from '../hooks/useHeader';
import { getRole, ROLES, getStudentId } from '../services/auth';
import { useData } from '../context/DataContext';

const TIMETABLE_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Timetable = () => {
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const isStudent = role === ROLES.STUDENT;
  const { setHeaderAction, setBackAction } = useHeader();
  const { batches, teachers, subjects, periods: definedPeriods, students } = useData();

  const [viewMode, setViewMode] = useState('overview');
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = DAYS[new Date().getDay()];
    return TIMETABLE_DAYS.includes(today) ? today : 'Saturday';
  });
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [allTimetables, setAllTimetables] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Ref for Drag-to-Scroll
  const scrollRef = useRef(null);

  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const autoRedirectedRef = useRef(false);

  const dragHandlers = useMemo(() => {
    return {
      onMouseDown: (e) => {
        if (!scrollRef.current) return;
        isDownRef.current = true;
        scrollRef.current.classList.add('active-dragging');
        startXRef.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeftRef.current = scrollRef.current.scrollLeft;
      },
      onMouseLeave: () => { 
        if (!scrollRef.current) return; 
        isDownRef.current = false; 
        scrollRef.current.classList.remove('active-dragging'); 
      },
      onMouseUp: () => { 
        if (!scrollRef.current) return; 
        isDownRef.current = false; 
        scrollRef.current.classList.remove('active-dragging'); 
      },
      onMouseMove: (e) => {
        if (!isDownRef.current || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walkX = (x - startXRef.current) * 2;
        scrollRef.current.scrollLeft = scrollLeftRef.current - walkX;
      }
    };
  }, []);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const timetableSnap = await getDocs(collection(db, 'timetables'));
      const ttMap = {};
      timetableSnap.docs.forEach(doc => {
        ttMap[doc.id] = doc.data().schedule || {};
      });
      setAllTimetables(ttMap);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { 
    Promise.resolve().then(() => fetchData()); 
  }, [fetchData]);

  // Auto-redirect student to their batch
  useEffect(() => {
    if (isStudent && students.length > 0 && !autoRedirectedRef.current) {
      const studentId = getStudentId();
      const currentStudent = students.find(s => s.id === studentId);
      if (currentStudent && currentStudent.batchId) {
        autoRedirectedRef.current = true;
        // Delay state updates to avoid cascading sync renders flagged by lint
        Promise.resolve().then(() => {
          setSelectedBatchId(currentStudent.batchId);
          setEditData(allTimetables[currentStudent.batchId] || {});
          setViewMode('planner');
        });
      }
    }
  }, [isStudent, students, allTimetables]);

  const openBatchPlanner = (batchId) => {
    setSelectedBatchId(batchId);
    setEditData(allTimetables[batchId] || {});
    setViewMode('planner');
    setIsEditing(false);
  };

  const updateSlot = (day, periodIdx, field, value) => {
    setEditData(prev => {
      const newDayPlan = [...(prev[day] || [])];
      while (newDayPlan.length <= periodIdx) newDayPlan.push({});
      
      const teacherName = field === 'teacherId' ? teachers.find(t => t.id === value)?.name : newDayPlan[periodIdx]?.teacherName;
      newDayPlan[periodIdx] = { ...newDayPlan[periodIdx], [field]: value, ...(field === 'teacherId' && { teacherName }) };
      
      return { ...prev, [day]: newDayPlan };
    });
  };

  const handleSave = React.useCallback(async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'timetables', selectedBatchId), {
        schedule: editData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setAllTimetables(prev => ({ ...prev, [selectedBatchId]: editData }));
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert(err.message); }
    setLoading(false);
  }, [selectedBatchId, editData]);

  useEffect(() => {
    if (viewMode !== 'overview' && !isStudent) {
      setBackAction(
        <button className="back-round-btn" onClick={() => setViewMode('overview')} title="Back">
          <ChevronLeft size={20} />
        </button>
      );
    } else {
      setBackAction(null);
    }

    setHeaderAction(
      <div className="header-timetable-actions">
        {viewMode === 'overview' ? (
          <div className="day-selector-group">
            <select className="header-select" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
              {TIMETABLE_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        ) : (
          <div className="header-actions-group">
            {isEditing ? (
              <button className="add-btn" onClick={handleSave} disabled={loading}>
                <Save size={16} /> <span>{loading ? 'Saving...' : 'Finalize Strategy'}</span>
              </button>
            ) : isAdmin && (
              <button className="add-btn" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> <span>Edit</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
    return () => {
      setHeaderAction(null);
      setBackAction(null);
    };
  }, [viewMode, selectedDay, isEditing, loading, isAdmin, isStudent, setHeaderAction, setBackAction, selectedBatchId, editData, handleSave]);

  return (
    <div className="timetable-page">
      {showSuccess && (
        <div className="success-toast glass">
          <CheckCircle2 size={18} color="#059669" />
          <span>Academic grid updated successfully!</span>
        </div>
      )}

      {definedPeriods.length === 0 && !loading && (
        <div className="empty-config-warning glass">
          <Info size={40} className="w-icon" />
          <h3>Configuration Deficiency Detected</h3>
          <p>Institutional cycles must be defined in the <strong>Periods</strong> management section before academic scheduling can commence.</p>
        </div>
      )}

      {viewMode === 'overview' && (
        <div className="dashboard-section">
          <div className="dashboard-header">
            <h1><LayoutGrid size={22} className="title-icon" /> Institutional Daily Schedule: {selectedDay}</h1>
            <p>Monitoring instructional cycles and faculty allocation across all active batches.</p>
          </div>

          <div className="batch-grid">
            {batches.map(batch => {
              const dayPlan = allTimetables[batch.id]?.[selectedDay] || [];
              return (
                <div key={batch.id} className="batch-summary-card glass">
                  <div className="card-header">
                    <h3>{batch.batchName}</h3>
                    {isAdmin && <button className="edit-link" onClick={() => openBatchPlanner(batch.id)}>Edit Weekly</button>}
                  </div>
                  <div className="card-list">
                    {definedPeriods.map((p, idx) => (
                      <div key={idx} className="list-entry">
                        <div className="time-strip">
                          <span className="t-main">{p.startTime}</span>
                          <span className="t-sub">{p.endTime}</span>
                        </div>
                        <div className="entry-content">
                          <div className="sub-txt">{dayPlan[idx]?.subject || <span className="free">Free Period</span>}</div>
                          {dayPlan[idx]?.teacherName && <div className="tea-tag"><User size={10} /> {dayPlan[idx].teacherName}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'planner' && (
        <div className="classic-planner">
          <div className="planner-intro">
            <div className="p-badge">Plan: {batches.find(b => b.id === selectedBatchId)?.batchName}</div>
            <h2>Academic Weekly Matrix</h2>
          </div>

          <div className="table-responsive-wrapper glass hide-scrollbar" ref={scrollRef} {...dragHandlers}>
            <table className="classic-table">
              <thead>
                <tr>
                  <th className="sticky-col">Period / Time</th>
                  {TIMETABLE_DAYS.map(day => <th key={day}>{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {definedPeriods.map((p, pIdx) => (
                  <tr key={p.id}>
                    <td className="sticky-col period-info">
                      <div className="p-name">{p.name}</div>
                      <div className="p-time">{p.startTime}-{p.endTime}</div>
                    </td>
                    {TIMETABLE_DAYS.map(day => (
                      <td key={day} className={`slot-cell ${isEditing ? 'input-active' : ''}`}>
                        {isEditing ? (
                          <div className="slot-editor">
                            <select
                              className="edit-sel sub"
                              value={editData[day]?.[pIdx]?.subject || ''}
                              onChange={(e) => updateSlot(day, pIdx, 'subject', e.target.value)}
                            >
                              <option value="">-- No Subject --</option>
                              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                            <select
                              className="edit-sel tea"
                              value={editData[day]?.[pIdx]?.teacherId || ''}
                              onChange={(e) => updateSlot(day, pIdx, 'teacherId', e.target.value)}
                            >
                              <option value="">-- Instructor --</option>
                              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div className="slot-view">
                            <div className="v-sub">{allTimetables[selectedBatchId]?.[day]?.[pIdx]?.subject || '--'}</div>
                            {allTimetables[selectedBatchId]?.[day]?.[pIdx]?.teacherName && (
                              <div className="v-tea"><User size={10} /> {allTimetables[selectedBatchId][day][pIdx].teacherName}</div>
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="planner-footer glass">
            <Info size={16} className="f-icon" />
            <span>Standardized period counts are locked to the institutional temporal configuration.</span>
          </div>
        </div>
      )}

      <style>{`
        .timetable-page { padding: 8px 0px; min-height: 100vh; }
        .header-timetable-actions { display: flex; align-items: center; gap: 12px; }
        .header-select { padding: 6px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-weight: 700; color: var(--primary); outline: none; }
        
        .success-toast { position: fixed; top: 100px; right: 20px; z-index: 2000; padding: 12px 24px; border-radius: 12px; border: 1px solid #059669; display: flex; align-items: center; gap: 12px; font-weight: 700; animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .dashboard-header { margin-bottom: 24px; padding: 0 16px; }
        .dashboard-header h1 { font-size: 1.1rem; color: #1e293b; display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .dashboard-header p { color: #94a3b8; font-size: 0.8rem; }
        
        .batch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 0 16px; }
        .batch-summary-card { border-radius: 16px; padding: 16px; border: 1px solid #f1f5f9; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .card-header h3 { font-size: 0.9rem; color: #334155; }
        .edit-link { color: var(--primary); font-size: 0.75rem; font-weight: 700; background: none; border: none; cursor: pointer; }
        
        .card-list { display: flex; flex-direction: column; gap: 8px; }
        .list-entry { display: flex; gap: 12px; align-items: center; padding: 6px 0; border-bottom: 1px solid #f8fafc; }
        .time-strip { display: flex; flex-direction: column; min-width: 60px; font-size: 0.65rem; font-weight: 800; color: #94a3b8; }
        .entry-content { display: flex; flex-direction: column; }
        .sub-txt { font-weight: 600; font-size: 0.8rem; color: #1e293b; }
        .tea-tag { color: var(--primary); font-size: 0.65rem; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        .free { color: #cbd5e1; font-style: italic; }

        .classic-planner { padding: 0 16px; animation: fadeIn 0.3s ease-out; }
        .planner-intro { margin-bottom: 16px; }
        .p-badge { background: #fff1f2; color: var(--primary); padding: 4px 12px; border-radius: 20px; font-size: 0.65rem; font-weight: 900; display: inline-block; margin-bottom: 8px; }
        .planner-intro h2 { font-size: 1.25rem; color: #1e293b; }

        /* HORIZONTAL SCROLLING FIX */
        .table-responsive-wrapper { overflow-x: auto; border-radius: 16px; background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.05); user-select: none; cursor: grab; }
        .table-responsive-wrapper.active-dragging { cursor: grabbing; scale: 0.998; transition: scale 0.2s; }
        .classic-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .classic-table th, .classic-table td { padding: 12px 16px; border: 1px solid #f1f5f9; text-align: center; }
        
        .sticky-col { position: sticky !important; left: 0; background: #f8fafc !important; z-index: 100; border-right: 2px solid #e2e8f0 !important; }
        tbody .sticky-col { background: white !important; z-index: 90; }
        .classic-table th { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; }

        .period-info { min-width: 120px; text-align: left !important; }
        .p-name { color: var(--primary); font-weight: 900; font-size: 0.75rem; }
        .p-time { font-size: 0.65rem; font-weight: 600; color: #94a3b8; }

        .slot-cell { min-width: 120px; transition: all 0.2s; position: relative; }
        .input-active { background: #fafbfc; }
        .slot-editor { display: flex; flex-direction: column; gap: 4px; }
        .edit-sel { width: 100%; padding: 4px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.7rem; font-weight: 700; color: #334155; outline: none; }
        .edit-sel:focus { border-color: var(--primary); }
        .edit-sel.sub { background: #fff1f2; border-color: #fff1f2; }

        .v-sub { font-weight: 700; font-size: 0.85rem; color: #334155; margin-bottom: 2px; }
        .v-tea { font-size: 0.65rem; color: var(--primary); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px; }

        .planner-footer { margin-top: 16px; padding: 12px 20px; display: flex; align-items: center; gap: 12px; color: #94a3b8; font-size: 0.7rem; font-weight: 600; border-radius: 12px; }

        .hide-scrollbar { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        .hide-scrollbar::-webkit-scrollbar { display: none !important; }

        @media (max-width: 768px) {
           .classic-table th, .classic-table td { padding: 10px 8px; }
           .v-sub { font-size: 0.75rem; }
           .slot-cell { min-width: 100px; }
        }
      `}</style>
    </div>
  );
};

export default Timetable;
