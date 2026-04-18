import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/firebase';
import { setDoc, serverTimestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  Check, X, CalendarClock, Plus, Search,
  FileDown, ChevronDown, CheckCircle2,
  Calendar as CalendarIcon, Shapes, ChevronLeft
} from 'lucide-react';
import { getRole, ROLES } from '../services/auth';
import { useHeader } from '../hooks/useHeader';
import { useData } from '../context/DataContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Attendance = () => {
  const role = getRole();
  const canMark = [ROLES.ADMIN, ROLES.TEACHER].includes(role);
  const { setHeaderAction, setBackAction } = useHeader();
  const { batches, students: allStudents } = useData();

  const [viewMode, setViewMode] = useState('list');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [batchTimetable, setBatchTimetable] = useState(null);
  const [aggregatedData, setAggregatedData] = useState({}); // { studentId: { periodId: status } }
  const [loading, setLoading] = useState(false);

  // Derive students for the selected batch from global state
  const students = useMemo(() => {
    if (!selectedBatch) return [];
    return allStudents.filter(s => s.batchId === selectedBatch);
  }, [allStudents, selectedBatch]);

  const [selectedPeriodSlot, setSelectedPeriodSlot] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Custom Dropdown States
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);

  // Refs for Drag and Outside Click
  const matrixRef = useRef(null);
  const listRef = useRef(null);
  const subjectDropdownRef = useRef(null);
  const batchDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) setIsSubjectDropdownOpen(false);
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(event.target)) setIsBatchDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDownMatrix = useRef(false);
  const startXMatrix = useRef(0);
  const scrollLeftMatrix = useRef(0);

  const matrixDrag = useMemo(() => {
    return {
      onMouseDown: (e) => {
        if (!matrixRef.current) return;
        isDownMatrix.current = true;
        matrixRef.current.classList.add('active-dragging');
        startXMatrix.current = e.pageX - matrixRef.current.offsetLeft;
        scrollLeftMatrix.current = matrixRef.current.scrollLeft;
      },
      onMouseLeave: () => { if (!matrixRef.current) return; isDownMatrix.current = false; matrixRef.current.classList.remove('active-dragging'); },
      onMouseUp: () => { if (!matrixRef.current) return; isDownMatrix.current = false; matrixRef.current.classList.remove('active-dragging'); },
      onMouseMove: (e) => {
        if (!isDownMatrix.current || !matrixRef.current) return;
        e.preventDefault();
        const x = e.pageX - matrixRef.current.offsetLeft;
        const walkX = (x - startXMatrix.current) * 2;
        matrixRef.current.scrollLeft = scrollLeftMatrix.current - walkX;
      }
    };
  }, []);

  const isDownList = useRef(false);
  const startXList = useRef(0);
  const scrollLeftList = useRef(0);

  const listDrag = useMemo(() => {
    return {
      onMouseDown: (e) => {
        if (!listRef.current) return;
        isDownList.current = true;
        listRef.current.classList.add('active-dragging');
        startXList.current = e.pageX - listRef.current.offsetLeft;
        scrollLeftList.current = listRef.current.scrollLeft;
      },
      onMouseLeave: () => { if (!listRef.current) return; isDownList.current = false; listRef.current.classList.remove('active-dragging'); },
      onMouseUp: () => { if (!listRef.current) return; isDownList.current = false; listRef.current.classList.remove('active-dragging'); },
      onMouseMove: (e) => {
        if (!isDownList.current || !listRef.current) return;
        e.preventDefault();
        const x = e.pageX - listRef.current.offsetLeft;
        const walkX = (x - startXList.current) * 2;
        listRef.current.scrollLeft = scrollLeftList.current - walkX;
      }
    };
  }, []);

  // Batch data is now synced via DataContext

  useEffect(() => {
    if (!selectedBatch) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    Promise.resolve().then(() => setLoading(true));

    // 1. Fetch Timetable (Usually stable)
    const fetchTT = async () => {
      try {
        const ttSnap = await getDoc(doc(db, 'timetables', selectedBatch));
        setBatchTimetable(ttSnap.exists() ? ttSnap.data().schedule : null);
      } catch (err) { console.error("TT Error:", err); }
    };

    Promise.resolve().then(() => {
      fetchTT();
    });

    // 2. Real-time Aggregated Attendance Sync
    const aggDocRef = doc(db, 'attendance_aggregated', `${selectedBatch}_${attendanceDate}`);
    const unsub = onSnapshot(aggDocRef, (snap) => {
      setAggregatedData(snap.exists() ? snap.data().records : {});
      setLoading(false);
    }, (err) => {
      console.error("Sync Error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedBatch, attendanceDate]);

  const activePeriods = useMemo(() => {
    if (!batchTimetable || !attendanceDate) return [];
    const dayName = DAYS[new Date(attendanceDate).getDay()];
    const schedule = batchTimetable[dayName] || [];
    return schedule.map((slot, idx) => ({
      subject: typeof slot === 'string' ? slot : slot?.subject,
      periodNumber: idx + 1
    })).filter(p => p.subject && p.subject !== '--' && p.subject !== '');
  }, [batchTimetable, attendanceDate]);

  const handleExportPDF = React.useCallback(() => {
    if (!selectedBatch || students.length === 0) return;
    const batchName = batches.find(b => b.id === selectedBatch)?.batchName || "Batch";
    const doc = new jsPDF('landscape');
    autoTable(doc, {
      startY: 35,
      head: [["Student Identity", ...activePeriods.map(p => `${p.subject} (P${p.periodNumber})`)]],
      body: students.map(s => [s.name, ...activePeriods.map(p => aggregatedData[s.id]?.[p.periodNumber]?.toUpperCase() || "-")]),
      theme: 'grid',
      headStyles: { fillColor: [244, 63, 94], textColor: 255, fontSize: 8 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index > 0) {
          if (data.cell.raw === 'PRESENT') data.cell.styles.fillColor = [209, 250, 229];
          else if (data.cell.raw === 'ABSENT') data.cell.styles.fillColor = [254, 226, 226];
        }
      }
    });
    doc.save(`Attendance_${batchName}_${attendanceDate}.pdf`);
  }, [selectedBatch, students, batches, activePeriods, aggregatedData, attendanceDate]);

  useEffect(() => {
    if (viewMode !== 'list') {
      setBackAction(
        <button className="back-round-btn" onClick={() => setViewMode('list')} title="Back">
          <ChevronLeft size={20} />
        </button>
      );
    } else {
      setBackAction(null);
    }

    setHeaderAction(
      <div className="header-actions-group">
        {viewMode === 'list' && (
          <>
            {selectedBatch && students.length > 0 && <button className="header-icon-btn" onClick={handleExportPDF} title="Export Matrix"><FileDown size={18} /></button>}
            {canMark && <button className="add-btn" onClick={() => setViewMode('add')}><Plus size={16} /><span>Attendance</span></button>}
          </>
        )}
      </div>
    );
    return () => {
      setHeaderAction(null);
      setBackAction(null);
    };
  }, [viewMode, canMark, setHeaderAction, setBackAction, selectedBatch, students, aggregatedData, activePeriods, handleExportPDF]);

  useEffect(() => {
    if (viewMode === 'add' && selectedPeriodSlot) {
      const initial = {};
      students.forEach(s => { initial[s.id] = aggregatedData[s.id]?.[selectedPeriodSlot.periodNumber] || 'present'; });
      Promise.resolve().then(() => setAttendanceForm(initial));
    }
  }, [selectedPeriodSlot, viewMode, students, aggregatedData]);

  useEffect(() => {
    if (viewMode === 'add' && activePeriods.length > 0 && !selectedPeriodSlot) {
      Promise.resolve().then(() => setSelectedPeriodSlot(activePeriods[0]));
    }
  }, [viewMode, activePeriods, selectedPeriodSlot]);

  const handleSaveAttendance = async () => {
    if (!selectedPeriodSlot) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'attendance_aggregated', `${selectedBatch}_${attendanceDate}`);
      const newAgg = { ...aggregatedData };
      Object.entries(attendanceForm).forEach(([studentId, status]) => {
        if (!newAgg[studentId]) newAgg[studentId] = {};
        newAgg[studentId][selectedPeriodSlot.periodNumber] = status;
      });
      await setDoc(docRef, { batchId: selectedBatch, date: attendanceDate, updatedAt: serverTimestamp(), records: newAgg }, { merge: true });
      setAggregatedData(newAgg);
      setViewMode('list'); 
    } catch (err) { alert("Error: " + err.message); }
    setSaving(false);
  };

  const currentBatchLabel = batches.find(b => b.id === selectedBatch)?.batchName || 'Select Batch...';

  return (
    <div className="attendance-page-wrapper">
      <div className="attendance-container">
        <div className="selectors-bar glass">
          {viewMode === 'list' ? (
            <>
              {/* AMAZING BATCH DROPDOWN */}
              <div className="sel-group fadeIn" ref={batchDropdownRef}>
                <label>Educational Batch</label>
                <div className={`custom-dropdown-selector ${isBatchDropdownOpen ? 'active' : ''}`} onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}>
                  <div className="selector-value-wrap">
                    <Shapes size={16} className="sel-icon" />
                    <span className="selector-value">{currentBatchLabel}</span>
                  </div>
                  <ChevronDown size={18} className={`dropdown-arrow ${isBatchDropdownOpen ? 'open' : ''}`} />
                </div>
                {isBatchDropdownOpen && (
                  <div className="custom-dropdown-list glass hide-scrollbar">
                    <div className="dropdown-item empty" onClick={() => { setSelectedBatch(''); setIsBatchDropdownOpen(false); }}>Clear Selection</div>
                    {batches.map(b => (
                      <div key={b.id} className={`dropdown-item ${selectedBatch === b.id ? 'selected' : ''}`} onClick={() => { setSelectedBatch(b.id); setIsBatchDropdownOpen(false); }}>
                        <div className="item-main"><span>{b.batchName}</span></div>
                        {selectedBatch === b.id && <CheckCircle2 size={14} className="marked-icon" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AMAZING DATE PICKER */}
              <div className="sel-group fadeIn">
                <label>Attendance Date</label>
                <div className="premium-input-wrap">
                  <CalendarIcon size={16} className="sel-icon" />
                  <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            /* AMAZING SUBJECT DROPDOWN */
            <div className="sel-group fadeIn" ref={subjectDropdownRef}>
              <label>Instructional Subject Selection</label>
              <div className="custom-dropdown-selector is-marking" onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}>
                <div className="selector-value">
                  {selectedPeriodSlot ? `${selectedPeriodSlot.subject} (Period ${selectedPeriodSlot.periodNumber})` : 'Select Subject...'}
                </div>
                <ChevronDown size={18} className={`dropdown-arrow ${isSubjectDropdownOpen ? 'open' : ''}`} />
              </div>
              {isSubjectDropdownOpen && (
                <div className="custom-dropdown-list glass hide-scrollbar">
                  {activePeriods.length === 0 ? <div className="dropdown-item empty">No Subjects Today</div> : activePeriods.map(p => {
                    const isMarked = Object.values(aggregatedData).some(s => s[p.periodNumber]);
                    return (
                      <div key={p.periodNumber} className={`dropdown-item ${selectedPeriodSlot?.periodNumber === p.periodNumber ? 'selected' : ''}`} onClick={() => { setSelectedPeriodSlot(p); setIsSubjectDropdownOpen(false); }}>
                        <div className="item-main">{isMarked && <CheckCircle2 size={14} className="marked-icon" />}<span>{p.subject}</span></div>
                        <span className="item-period">P{p.periodNumber}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {!selectedBatch ? (
          <div className="attendance-placeholder-area">
            <div className="empty-state-card glass centered">
              <Search size={48} className="dim-icon" />
              <h3>Attendance Portal</h3>
              <p>Please select a batch to view records.</p>
            </div>
          </div>
        ) : loading && Object.keys(aggregatedData).length === 0 ? (
          <div className="marking-list-panel glass" style={{ border: 'none', background: 'transparent', textAlign: 'center', padding: '100px' }}>
            <div className="loader" style={{ margin: '0 auto 16px' }}></div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Syncing Records...</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="records-layout">
            {activePeriods.length === 0 ? (
              <div className="no-data"><CalendarClock size={40} className="dim-icon" /><h3>No Active Schedule</h3><p>Adjust the timetable for this batch/date.</p></div>
            ) : (
              <div className="records-table-wrapper glass">
                <div className="table-responsive hide-scrollbar" ref={matrixRef} {...matrixDrag}>
                  <table className="matrix-table">
                    <thead><tr><th className="sticky-col-header">Student Identity</th>{activePeriods.map(p => (<th key={p.periodNumber}><div className="sub-name">{p.subject}</div><div className="sub-num">({p.periodNumber})</div></th>))}</tr></thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.id}>
                          <td className="student-info-cell sticky-col-cell"><div className="s-avatar">{student.name.charAt(0)}</div><span className="s-label">{student.name}</span></td>
                          {activePeriods.map(p => {
                            const status = aggregatedData[student.id]?.[p.periodNumber];
                            return (<td key={p.periodNumber} className="status-cell">{status ? (<div className={`status-icon ${status}`}>{status === 'present' ? <Check size={14} /> : <X size={14} />}</div>) : <span className="null-val">--</span>}</td>);
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="marking-layout">
            <div className="marking-list-panel glass">
              <div className="list-body hide-scrollbar" ref={listRef} {...listDrag}>
                {students.map(student => (
                  <div key={student.id} className="marking-row"><div className="m-student"><div className="m-avatar">{student.name.charAt(0)}</div><span>{student.name}</span></div><div className="m-actions"><button className={`m-btn p ${attendanceForm[student.id] === 'present' ? 'selected' : ''}`} onClick={() => setAttendanceForm(prev => ({ ...prev, [student.id]: 'present' }))}><Check size={14} /> <span>Present</span></button><button className={`m-btn a ${attendanceForm[student.id] === 'absent' ? 'selected' : ''}`} onClick={() => setAttendanceForm(prev => ({ ...prev, [student.id]: 'absent' }))}><X size={14} /> <span>Absent</span></button></div></div>
                ))}
              </div>
              <div className="marking-footer"><button className="confirm-btn" onClick={handleSaveAttendance} disabled={saving}>{saving ? 'Processing Aggregation...' : 'Save Unified Session Records'}</button></div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .attendance-page-wrapper { padding: 4px 0px; display: flex; justify-content: center; min-height: calc(100vh - 100px); }
        .attendance-container { width: 100%; max-width: 1400px; display: flex; flex-direction: column; }
        .attendance-placeholder-area { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 400px; }
        .empty-state-card.centered { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; border-radius: 20px; max-width: 400px; }
        .empty-state-card h3 { font-size: 1.2rem; font-weight: 800; color: #1e293b; margin: 16px 0 8px; }
        .empty-state-card p { font-size: 0.9rem; color: #64748b; }
        
        .selectors-bar { display: flex; gap: 12px; padding: 12px 16px; margin-bottom: 12px; border-radius: 12px; }
        .sel-group { display: flex; flex-direction: column; gap: 2px; flex: 1; position: relative; }
        .sel-group label { font-size: 0.6rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; padding-left: 4px; }

        .hide-scrollbar { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        .hide-scrollbar::-webkit-scrollbar { display: none !important; }

        .custom-dropdown-selector { height: 48px; background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; cursor: pointer; transition: all 0.2s; }
        .custom-dropdown-selector:hover { border-color: #cbd5e1; background: #f8fafc; }
        .custom-dropdown-selector.active { border-color: var(--primary); background: white; box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.05); }
        .custom-dropdown-selector.is-marking { border-color: var(--primary); background: #fff1f2; }
        
        .selector-value-wrap { display: flex; align-items: center; gap: 10px; }
        .sel-icon { color: #94a3b8; flex-shrink: 0; }
        .custom-dropdown-selector.active .sel-icon, .is-marking .sel-icon { color: var(--primary); }
        .selector-value { font-weight: 700; color: #334155; font-size: 0.85rem; }
        .is-marking .selector-value { color: var(--primary); font-weight: 800; }
        
        .dropdown-arrow { transition: transform 0.3s; color: #94a3b8; }
        .dropdown-arrow.open { transform: rotate(180deg); color: var(--primary); }

        .custom-dropdown-list { position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 1000; border-radius: 16px; border: 1px solid #f1f5f9; padding: 6px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); animation: dropIn 0.25s ease-out; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(10px); max-height: 280px; overflow-y: auto; }
        @keyframes dropIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .dropdown-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 10px; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; }
        .dropdown-item:hover { background: #f8fafc; }
        .dropdown-item.selected { background: #fff1f2; color: var(--primary); font-weight: 800; }
        .dropdown-item.empty { font-size: 0.75rem; color: #94a3b8; justify-content: center; font-style: italic; }
        .item-main { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
        .marked-icon { color: #10b981; }
        .item-period { font-size: 0.6rem; font-weight: 900; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; }

        .premium-input-wrap { position: relative; }
        .premium-input-wrap .sel-icon { position: absolute; left: 14px; top: 16px; z-index: 2; pointer-events: none; }
        .premium-input-wrap input { width: 100%; height: 48px; padding: 0 16px 0 40px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-weight: 700; color: #334155; font-size: 0.85rem; outline: none; transition: all 0.2s; }
        .premium-input-wrap input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.05); }

        .active-dragging { cursor: grabbing !important; }
        .fadeIn { animation: fadeIn 0.3s ease-out; }
        
        .records-table-wrapper { border-radius: 12px; overflow: hidden; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .table-responsive { overflow-x: auto; cursor: grab; user-select: none; }
        .matrix-table { width: 100%; border-collapse: collapse; background: white; }
        .matrix-table th, .matrix-table td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; vertical-align: middle; }
        
        .sticky-col-header { position: sticky !important; left: 0; background: #f8fafc !important; z-index: 100; border-right: 2px solid #f1f5f9; text-align: left !important; }
        .sticky-col-cell { position: sticky !important; left: 0; background: white !important; z-index: 90; border-right: 2px solid #f1f5f9; }
        .matrix-table tr:nth-child(even) .sticky-col-cell { background: #fafbfc !important; }
        .sticky-col-header::after, .sticky-col-cell::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(to right, rgba(0,0,0,0.02), transparent); pointer-events: none; }

        .matrix-table th { background: #f8fafc; font-size: 0.7rem; font-weight: 800; padding: 12px; }
        .sub-name { color: var(--primary); margin-bottom: 2px; text-transform: uppercase; }
        .sub-num { color: #94a3b8; font-size: 0.6rem; }
        .student-info-cell { display: flex; align-items: center; gap: 10px; min-width: 180px; }
        .s-avatar { width: 24px; height: 24px; border-radius: 50%; background: #fff1f2; color: var(--primary); font-size: 0.65rem; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .s-label { font-size: 0.8rem; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .status-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
        .status-icon.present { background: #ecfdf5; color: #059669; }
        .status-icon.absent { background: #fef2f2; color: #dc2626; }
        
        .marking-list-panel { border-radius: 12px; background: white; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .list-body { max-height: 500px; overflow-y: auto; cursor: grab; }
        .marking-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f8fafc; gap: 12px; }
        .m-student { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 0.85rem; color: #334155; flex: 1; min-width: 0; }
        .m-student span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .m-avatar { width: 32px; height: 32px; border-radius: 50%; background: #fff1f2; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 900; flex-shrink: 0; }
        .m-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .m-btn { padding: 8px 12px; border: 1.5px solid #e2e8f0; background: white; border-radius: 8px; display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 800; cursor: pointer; transition: all 0.2s; min-width: 80px; justify-content: center; }
        .m-btn.p.selected { background: #059669; color: white; border-color: #059669; }
        .m-btn.a.selected { background: #dc2626; color: white; border-color: #dc2626; }
        .marking-footer { padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; background: #fcfcfc; }
        .confirm-btn { padding: 14px 40px; background: var(--primary); color: white; border: none; border-radius: 10px; font-weight: 900; font-size: 0.95rem; cursor: pointer; }

        @media (max-width: 768px) {
           .selectors-bar { flex-direction: column; gap: 8px; }
           .custom-dropdown-selector, .premium-input-wrap input { height: 44px; }
           .marking-row { padding: 10px 12px; gap: 8px; }
           .m-student { font-size: 0.75rem; }
           .m-btn { padding: 6px 8px; min-width: 65px; gap: 4px; border-radius: 6px; }
        }
      `}</style>
    </div>
  );
};

export default Attendance;
