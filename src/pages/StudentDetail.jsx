import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import {
  User, Calendar, Edit2, Trash2,
  Phone, MapPin, GraduationCap, Heart, Users, MessageSquare,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Info,
  FileDown, BookOpen, Trophy, ChevronDown, ChevronUp, RefreshCw, Bell
} from 'lucide-react';
import { getRole, ROLES, getStudentId } from '../services/auth';
import { updateStudent, deleteStudent } from '../services/studentService';
import { uploadToCloudinary } from '../services/cloudinary';
import { useHeader } from '../hooks/useHeader';
import Modal from '../components/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/StudentDetail.css';

import { useData } from '../context/DataContext';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const StudentDetail = ({ studentId: propId }) => {
  const { id: routeId } = useParams();
  const id = propId || routeId;
  const navigate = useNavigate();
  const role = getRole();
  const isAdmin = role === ROLES.ADMIN;
  const isTeacher = role === ROLES.TEACHER;
  const isStudent = role === ROLES.STUDENT;
  const isParent = role === ROLES.PARENT;
  const canContact = isAdmin || isTeacher;
  const { setHeaderAction, setBackAction } = useHeader();
  const { students: allStudents, batches, loading: contextLoading } = useData();

  const student = useMemo(() => allStudents.find(s => s.id === id), [allStudents, id]);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const initialSyncRef = useRef(false);
  useEffect(() => {
    if (allStudents.length > 0) {
      if (student) {
        if (!initialSyncRef.current) {
          setEditFormData(student);
          initialSyncRef.current = true;
        }
        setLoading(false);
      } else if (!contextLoading.students) {
        navigate('/dashboard/students');
      }
    }
  }, [allStudents, student, id, navigate, contextLoading.students]);

  // -- REPORT STATE --
  const [reportDate, setReportDate] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [batchTimeline, setBatchTimeline] = useState(null);
  const [globalPeriods, setGlobalPeriods] = useState([]);
  const [records, setRecords] = useState({ performance: [], notes: [] });
  const [openExamId, setOpenExamId] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const scrollAreaRef = useRef(null);

  const isDownDossier = useRef(false);
  const startXDossier = useRef(0);
  const scrollLeftDossier = useRef(0);

  const dossierDrag = useMemo(() => {
    return {
      onMouseDown: (e) => {
        if (!scrollAreaRef.current) return;
        isDownDossier.current = true;
        scrollAreaRef.current.classList.add('active-dragging');
        startXDossier.current = e.pageX - scrollAreaRef.current.offsetLeft;
        scrollLeftDossier.current = scrollAreaRef.current.scrollLeft;
      },
      onMouseLeave: () => { if (!scrollAreaRef.current) return; isDownDossier.current = false; scrollAreaRef.current.classList.remove('active-dragging'); },
      onMouseUp: () => { if (!scrollAreaRef.current) return; isDownDossier.current = false; scrollAreaRef.current.classList.remove('active-dragging'); },
      onMouseMove: (e) => {
        if (!isDownDossier.current || !scrollAreaRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollAreaRef.current.offsetLeft;
        const walkX = (x - startXDossier.current) * 2;
        scrollAreaRef.current.scrollLeft = scrollLeftDossier.current - walkX;
      }
    };
  }, []);

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

  useEffect(() => {
    const sId = getStudentId();
    if ((role === ROLES.STUDENT || role === ROLES.PARENT) && sId && sId !== id) {
       navigate(`/dashboard/students/${sId}`, { replace: true });
    }
  }, [role, id, navigate]);

  // -- REAL-TIME MONITORING --
  useEffect(() => {
    if (!student?.batchId) return;

    // 1. Sync Monthly Attendance for the batch
    setReportLoading(true);
    const yearMonthPrefix = `${reportDate.year}-${String(reportDate.month + 1).padStart(2, '0')}`;
    const qAgg = query(collection(db, 'attendance_aggregated'), where('batchId', '==', student.batchId));
    
    const unsubAgg = onSnapshot(qAgg, (snap) => {
      const dataMap = {};
      snap.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d.date && d.date.startsWith(yearMonthPrefix)) {
          dataMap[d.date] = d.records?.[id] || {};
        }
      });
      Promise.resolve().then(() => {
        setMonthlyAttendance(dataMap);
        setReportLoading(false);
      });
    });

    const qNotes = query(collection(db, 'remarks'), where('studentId', '==', id));
    const unsubNotes = onSnapshot(qNotes, (snap) => {
      const notesList = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      Promise.resolve().then(() => {
        setRecords(prev => ({ ...prev, notes: notesList }));
      });
    });

    return () => {
      unsubAgg();
      unsubNotes();
    };
  }, [student, reportDate, id]);

  const fetchMetadata = useCallback(async () => {
    if (!student) return;
    try {
      const [periodSnap, examTypeSnap] = await Promise.all([
        getDocs(query(collection(db, 'periods'), orderBy('startTime', 'asc'))),
        getDocs(collection(db, 'exam_types'))
      ]);

      setGlobalPeriods(periodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const examTypesDict = {};
      examTypeSnap.docs.forEach(d => { examTypesDict[d.id] = d.data().title; });

      if (student.batchId) {
        const ttSnap = await getDoc(doc(db, 'timetables', student.batchId));
        if (ttSnap.exists()) setBatchTimeline(ttSnap.data().schedule);

        const examsSnap = await getDocs(query(collection(db, 'exams'), where('batchId', '==', student.batchId)));
        const examDocs = examsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const markPromises = examDocs.map(ex => getDoc(doc(db, 'marks', ex.id)));
        const markSnaps = await Promise.all(markPromises);

        const performanceRecords = examDocs.map((ex, idx) => {
          const mSnap = markSnaps[idx];
          const studentMarks = mSnap.exists() ? mSnap.data().records?.[id] || {} : {};
          return { id: ex.id, title: examTypesDict[ex.examTypeId] || 'Internal Assessment', date: ex.date, subjects: ex.subjects, marks: studentMarks };
        });
        setRecords(prev => ({ ...prev, performance: performanceRecords }));
      }
    } catch (error) { console.error("Identity Load Error:", error); }
  }, [id, student]);

  useEffect(() => { 
    if (student) fetchMetadata(); 
  }, [student, fetchMetadata]);

  const handleDeleteProfile = useCallback(async () => {
    if (window.confirm("Verify permanent delete?")) {
      try {
        await deleteStudent(student.id, student.avatarPublicId);
        navigate('/dashboard/students');
      } catch (err) { console.error(err); }
    }
  }, [student, navigate]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setBackAction(
        <button className="back-round-btn" onClick={() => navigate(-1)} title="Back">
          <ChevronLeft size={20} />
        </button>
      );

      if (isAdmin && student) {
        setHeaderAction(
          <div className="header-actions-group">
            <button className="header-icon-btn" onClick={() => setIsEditModalOpen(true)} title="Edit Profile">
              <Edit2 size={18} />
            </button>
            <button className="header-icon-btn delete" onClick={handleDeleteProfile} title="Delete Student">
              <Trash2 size={18} />
            </button>
          </div>
        );
      }
    });

    return () => {
      setHeaderAction(null);
      setBackAction(null);
    };
  }, [isAdmin, student, navigate, setHeaderAction, setBackAction, handleDeleteProfile]);

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      let finalData = { ...editFormData };
      if (selectedFile) {
        const cloudData = await uploadToCloudinary(selectedFile);
        finalData.avatarUrl = cloudData.secure_url;
        finalData.avatarPublicId = cloudData.public_id;
      }
      await updateStudent(student.id, finalData);
      setIsEditModalOpen(false);
    } catch (err) { console.error(err); alert("Failure."); }
    setSaveLoading(false);
  };

  // Derived Batch Name
  const batchName = useMemo(() => {
    if (!student || !batches) return 'Unknown Batch';
    return batches.find(b => b.id === student.batchId)?.batchName || 'Unknown Batch';
  }, [student, batches]);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote) return;
    try {
      await addDoc(collection(db, 'remarks'), {
        studentId: id,
        noteText: newNote,
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      setNewNote('');
    } catch (error) { console.error(error); }
  };

  const handleUpdateNote = async (noteId) => {
    if (!editNoteText) return;
    try {
      const { doc: fireDoc, updateDoc } = await import('firebase/firestore');
      await updateDoc(fireDoc(db, 'remarks', noteId), {
        noteText: editNoteText,
        updatedAt: serverTimestamp()
      });
      setEditingNoteId(null);
    } catch (error) { console.error(error); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Verify permanent remark deletion?")) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'remarks', noteId));
    } catch (error) { console.error(error); }
  };

  const reportDays = useMemo(() => {
    const daysInMonth = new Date(reportDate.year, reportDate.month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${reportDate.year}-${String(reportDate.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const d = new Date(dateStr);
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
      return { dayNum, dateStr, dayName };
    });
  }, [reportDate]);

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    const title = `Institutional Attendance Record: ${student.name}`;
    const subtitle = `Batch ID: ${student.batchName} | Cycle: ${MONTHS[reportDate.month]} ${reportDate.year}`;

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 28);

    const headers = [["Date", ...globalPeriods.map(p => p.name)]];
    const body = reportDays.map(rd => {
      const dayStatusMap = monthlyAttendance[rd.dateStr] || {};
      const daySchedule = batchTimeline?.[rd.dayName] || [];
      const row = [`${rd.dayNum} ${rd.dayName.substring(0, 3)}`];

      globalPeriods.forEach((p, pIdx) => {
        const slot = daySchedule[pIdx];
        const subName = typeof slot === 'string' ? slot : slot?.subject;
        const hasPeriod = subName && subName !== '--' && subName !== '';
        const status = dayStatusMap[String(pIdx + 1)];

        if (!hasPeriod) row.push("--");
        else if (!status) row.push("-");
        else row.push(status.toUpperCase());
      });
      return row;
    });

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [244, 63, 94], textColor: 255, fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      styles: { fontSize: 7, halign: 'center' },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index > 0) {
          const val = data.cell.raw;
          if (val === 'PRESENT') {
            data.cell.styles.fillColor = [209, 250, 229];
            data.cell.styles.textColor = [5, 150, 105];
          } else if (val === 'ABSENT') {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      }
    });

    doc.save(`Attendance_${student.name.replace(/\s+/g, '_')}_${MONTHS[reportDate.month]}.pdf`);
  };

  if (loading || !student) {
    return (
      <div className="loading-state">
        <div className="loader"></div>
        <p>Syncing Educational Dossier...</p>
      </div>
    );
  }

  return (
    <div className="student-detail-page">
      <div className="profile-header-new">
        <div className="header-left">
          <div className="profile-avatar-large" onClick={() => student.avatarUrl && setIsImageModalOpen(true)} style={{ cursor: student.avatarUrl ? 'pointer' : 'default' }}>
            {student.avatarUrl ? <img src={student.avatarUrl} alt="" /> : student.name.charAt(0)}
          </div>
          <div className="profile-titles">
            <h1>{student.name}</h1>
            <div className="profile-subtitle">
              <span className="id-tag">{[student.houseName, student.place].filter(Boolean).join(', ') || 'No Address Information'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-nav-tabs">
        <button className={activeTab === 'details' ? 'active' : ''} onClick={() => setActiveTab('details')}>Identity</button>
        <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>Attendance</button>
        <button className={activeTab === 'marks' ? 'active' : ''} onClick={() => setActiveTab('marks')}>Performance</button>
        <button className={activeTab === 'notes' ? 'active' : ''} onClick={() => setActiveTab('notes')}>Remarks</button>
      </div>

      <div className="profile-content-body">
        {activeTab === 'details' && (
          <div className="profile-data-sections fadeIn">
            <section className="profile-card">
              <div className="card-header"><User size={16} /><h3>Personal Information</h3></div>
              <div className="data-grid-layout">
                <div className="data-item"><label>Age</label><p>{student.age || 'N/A'}</p></div>
                <div className="data-item"><label>Blood Group</label><p><Heart size={12} className="ico-red" /> {student.bloodGroup || 'N/A'}</p></div>
                <div className="data-item full-width"><label>House Name</label><p>{student.houseName || 'N/A'}</p></div>
                <div className="data-item full-width"><label>Place</label><p><MapPin size={12} /> {student.place || 'N/A'}</p></div>
                <div className="data-item full-width"><label>Full Address</label><p>{student.address || 'N/A'}</p></div>
              </div>
            </section>
            <section className="profile-card"><div className="card-header"><GraduationCap size={16} /><h3>Academic Progress</h3></div><div className="data-grid-layout"><div className="data-item full-width"><label>Batch</label><p>{batchName}</p></div><div className="data-item full-width"><label>School Class</label><p>{student.schoolClass || 'N/A'}</p></div></div></section>
            <section className="profile-card"><div className="card-header"><Users size={16} /><h3>Family Information</h3></div><div className="data-grid-layout"><div className="data-item full-width"><label>Guardian</label><p>{student.guardianName || 'N/A'}</p></div><div className="data-item full-width"><label>Mother</label><p>{student.motherName || 'N/A'}</p></div><div className="data-item full-width"><label>Father's Job</label><p>{student.fatherJob || 'N/A'}</p></div></div></section>
            <section className="profile-card full-width-card">
              <div className="card-header"><Phone size={16} /><h3>Direct Contact</h3></div>
              <div className="data-grid-layout contact-grid">
                <div className="data-item"><label>Guardian Phone</label><div className="contact-row"><p>{student.guardianPhone || 'N/A'}</p>{canContact && student.guardianPhone && <a href={`tel:${student.guardianPhone}`} className="contact-icon-btn call"><Phone size={14} /></a>}</div></div>
                <div className="data-item"><label>Guardian WhatsApp</label><div className="contact-row"><p>{student.guardianWhatsApp || student.guardianPhone || 'N/A'}</p>{canContact && <a href={`https://wa.me/${(student.guardianWhatsApp || student.guardianPhone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-icon-btn whatsapp"><MessageSquare size={14} /></a>}</div></div>
                <div className="data-item"><label>Student Phone</label><div className="contact-row"><p>{student.studentPhone || 'N/A'}</p>{canContact && student.studentPhone && <a href={`tel:${student.studentPhone}`} className="contact-icon-btn call"><Phone size={14} /></a>}</div></div>
                <div className="data-item"><label>Student WhatsApp</label><div className="contact-row"><p>{student.studentWhatsApp || 'N/A'}</p>{canContact && student.studentWhatsApp && <a href={`https://wa.me/${student.studentWhatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-icon-btn whatsapp"><MessageSquare size={14} /></a>}</div></div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="attendance-dossier-wrapper fadeIn">
            <div className="dossier-controls glass">
              <div className="date-nav">
                <button onClick={() => setReportDate(prev => prev.month === 0 ? { month: 11, year: prev.year - 1 } : { ...prev, month: prev.month - 1 })}><ChevronLeft size={18} /></button>
                <div className="nav-label"><strong>{MONTHS[reportDate.month]}</strong> {reportDate.year}</div>
                <button onClick={() => setReportDate(prev => prev.month === 11 ? { month: 0, year: prev.year + 1 } : { ...prev, month: prev.month + 1 })}><ChevronRight size={18} /></button>
              </div>
              <div className="dossier-actions">
                <button className="export-pdf-btn" onClick={handleExportPDF} title="Download Monthly Report">
                  <FileDown size={18} />
                </button>
                <div className="dossier-divider"></div>
                {reportLoading && <RefreshCw size={14} className="spin-icon" />}
                <div className="dossier-legend">
                  <div className="leg-item"><CheckCircle2 size={12} color="#10b981" /><span>P</span></div>
                  <div className="leg-item"><XCircle size={12} color="#ef4444" /><span>A</span></div>
                </div>
              </div>
            </div>

            <div className="dossier-matrix-wrapper glass">
              <div className="matrix-scroll-area" ref={scrollAreaRef} {...dossierDrag}>
                <table className="dossier-table">
                  <thead><tr><th className="sticky-col">Date</th>{globalPeriods.map(p => <th key={p.id}>{p.name}</th>)}</tr></thead>
                  <tbody>
                    {reportDays.map(rd => {
                      const dayStatusMap = monthlyAttendance[rd.dateStr] || {};
                      const daySchedule = batchTimeline?.[rd.dayName] || [];
                      return (
                        <tr key={rd.dayNum}>
                          <td className={`sticky-col d-tile ${rd.dayName === 'Friday' ? 'is-holiday' : ''}`}>
                            <div className="d-num">{rd.dayNum}</div>
                            <div className="d-name">{rd.dayName.substring(0, 3)}</div>
                          </td>
                          {globalPeriods.map((p, pIdx) => {
                            const slot = daySchedule[pIdx];
                            const subName = typeof slot === 'string' ? slot : slot?.subject;
                            const hasPeriod = subName && subName !== '--' && subName !== '';
                            const status = dayStatusMap[String(pIdx + 1)];
                            return (
                              <td key={p.id} className={`status-cell ${status === 'present' ? 'is-present' : status === 'absent' ? 'is-absent' : ''}`}>
                                {hasPeriod ? (
                                  <div className="cell-content">
                                    <span className="p-sub-mini">{subName}</span>
                                    {status ? (
                                      <div className={`status-orb ${status}`}>
                                        {status === 'present' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                      </div>
                                    ) : <span className="p-null">?</span>}
                                  </div>
                                ) : <div className="no-p">--</div>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marks' && (
          <div className="performance-container fadeIn">
            <div className="sec-header"><Trophy size={18} color="var(--primary)" /> <h3>Academic Performance History</h3></div>
            <div className="exam-vertical-list">
              {records.performance.length === 0 ? (
                <div className="empty-state-p glass">No assessment records found for this academic cycle.</div>
              ) : records.performance.map(ex => {
                const isOpen = openExamId === ex.id;
                return (
                  <div key={ex.id} className={`exam-acc-card ${isOpen ? 'active' : ''}`}>
                    <div className="exam-acc-header" onClick={() => setOpenExamId(isOpen ? null : ex.id)}>
                      <div className="e-main-info">
                        <div className="e-icon"><BookOpen size={18} /></div>
                        <div className="e-titles"><h4>{ex.title}</h4><span>Cycle: {ex.year}</span></div>
                      </div>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>

                    {isOpen && (
                      <div className="exam-acc-body anim-expand">
                        <div className="performance-sheet-wrapper">
                          <table className="performance-sheet">
                            <thead>
                              <tr>
                                <th className="sub-col">Subject Title</th>
                                <th className="val-col">Obtained</th>
                                <th className="max-col">Capacity</th>
                                <th className="pct-col">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ex.subjects.map((sub, sidx) => {
                                const markVal = parseFloat(sub.studentMark || 0);
                                const maxVal = parseFloat(sub.totalMark || 100);
                                const pct = sub.studentMark ? Math.round((markVal / maxVal) * 100) : 0;
                                const isPass = pct >= 40;
                                return (
                                  <tr key={sidx}>
                                    <td className="sub-n">{sub.name}</td>
                                    <td className={`sub-m ${!sub.studentMark ? 'pending' : ''}`}>{sub.studentMark || '--'}</td>
                                    <td className="sub-t">{sub.totalMark}</td>
                                    <td className="sub-p">
                                      {sub.studentMark ? (
                                        <span className={`pct-badge ${isPass ? 'pass' : 'fail'}`}>{pct}%</span>
                                      ) : '--'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="sheet-footer">
                               {(() => {
                                  const totalObtained = ex.subjects.reduce((acc, s) => acc + parseFloat(s.studentMark || 0), 0);
                                  const totalMax = ex.subjects.reduce((acc, s) => acc + parseFloat(s.totalMark || 0), 0);
                                  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
                                  return (
                                    <tr className="grand-total-row">
                                       <td className="total-lbl">Institutional Grand Total</td>
                                       <td className="total-val">{totalObtained}</td>
                                       <td className="total-max">{totalMax}</td>
                                       <td className="total-pct"><div className="overall-pct-pill">{overallPct}%</div></td>
                                    </tr>
                                  );
                               })()}
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-vertical-flow fadeIn">
            {(!isStudent && !isParent) && (
              <form onSubmit={handleAddNote} className="note-input-area">
                <textarea placeholder="Write institutional detail..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                <button className="post-btn" disabled={!newNote}>Publish Remark</button>
              </form>
            )}
            <div className="timeline-container">
              {records.notes.map(note => (
                <div key={note.id} className="timeline-card glass">
                  <div className="card-ctrl">
                    {editingNoteId === note.id ? (
                      <div className="edit-note-mode">
                        <textarea value={editNoteText} onChange={(e) => setEditNoteText(e.target.value)} autoFocus />
                        <div className="edit-btns">
                          <button className="e-save" onClick={() => handleUpdateNote(note.id)}>Save</button>
                          <button className="e-cancel" onClick={() => setEditingNoteId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="note-body">
                          <p>{note.noteText}</p>
                          <div className="note-footer">
                            <small>{new Date(note.date).toLocaleDateString()} — Master Record</small>
                            {(!isStudent && !isParent) && (
                              <div className="note-actions">
                                <button className="n-act edit" onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.noteText); }}><Edit2 size={12} /></button>
                                <button className="n-act del" onClick={() => handleDeleteNote(note.id)}><Trash2 size={12} /></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} variant="image"><div className="full-image-view"><img src={student.avatarUrl} alt={student.name} /></div></Modal>
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modify Student Detail">
        <form onSubmit={handleUpdateStudent}>
          <EditModalContent formData={editFormData} setFormData={setEditFormData} setSelectedFile={setSelectedFile} previewUrl={previewUrl} batches={batches} />
          <div className="modal-actions"><button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>Discard</button><button type="submit" className="save-btn" disabled={saveLoading}>{saveLoading ? 'Applying...' : 'Secure Secure'}</button></div>
        </form>
      </Modal>

      <style>{`
        .student-detail-page { padding: 4px 0px; min-height: 100vh; }
        .fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        /* PERFORMANCE STYLES */
        .performance-container { display: flex; flex-direction: column; gap: 16px; }
        .sec-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .sec-header h3 { font-size: 0.9rem; font-weight: 800; color: #1e293b; text-transform: uppercase; }
        .exam-vertical-list { display: flex; flex-direction: column; gap: 12px; }
        .exam-acc-card { background: white; border-radius: 16px; border: 1px solid #f1f5f9; overflow: hidden; transition: 0.2s; }
        .exam-acc-card.active { border-color: var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
        .exam-acc-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s; }
        .exam-acc-header:hover { background: #f8fafc; }
        .e-main-info { display: flex; align-items: center; gap: 16px; }
        .e-icon { width: 40px; height: 40px; border-radius: 12px; background: #fff1f2; color: var(--primary); display: flex; align-items: center; justify-content: center; }
        .e-titles h4 { font-size: 0.95rem; color: #1e293b; font-weight: 800; margin-bottom: 2px; }
        .e-titles span { font-size: 0.65rem; color: #94a3b8; font-weight: 900; text-transform: uppercase; }
        .exam-acc-body { border-top: 1px solid #f1f5f9; background: #fafafa; padding: 20px; }
        .performance-sheet-wrapper { background: white; border-radius: 12px; border: 1.5px solid #f1f5f9; overflow: hidden; }
        .performance-sheet { width: 100%; border-collapse: collapse; }
        .performance-sheet th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 0.65rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; }
        .performance-sheet td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .performance-sheet tr:last-child td { border-bottom: none; }
        .performance-sheet tr:hover { background: #fffcfc; }
        .sub-col { width: 40%; }
        .val-col, .max-col, .pct-col { width: 20%; text-align: center !important; }
        .performance-sheet th.val-col, .performance-sheet th.max-col, .performance-sheet th.pct-col { text-align: center; }
        .sub-n { font-size: 0.85rem; font-weight: 700; color: #334155; }
        .sub-m { font-size: 0.95rem; font-weight: 900; color: var(--primary); text-align: center; }
        .sub-m.pending { color: #cbd5e1; font-weight: 400; }
        .sub-t { font-size: 0.8rem; color: #94a3b8; font-weight: 700; text-align: center; }
        .sub-p { text-align: center; }
        .pct-badge { padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; }
        .pct-badge.pass { background: #d1fae5; color: #059669; }
        .pct-badge.fail { background: #fee2e2; color: #dc2626; }

        /* GRAND TOTAL FOOTER STYLES */
        .grand-total-row { background: #f8fafc; border-top: 2.5px solid #f1f5f9 !important; }
        .grand-total-row td { padding: 16px !important; font-weight: 900 !important; color: #1e293b !important; }
        .total-lbl { color: #64748b !important; font-size: 0.75rem !important; text-transform: uppercase; letter-spacing: 0.5px; }
        .total-val { font-size: 1.05rem !important; color: var(--primary) !important; text-align: center !important; }
        .total-max { text-align: center !important; color: #94a3b8 !important; }
        .total-pct { text-align: center !important; }
        .overall-pct-pill { background: #1e293b; color: white; display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; letter-spacing: 0.5px; }

        .empty-state-p { padding: 40px; text-align: center; color: #94a3b8; font-weight: 700; font-size: 0.85rem; }
        .anim-expand { animation: expand 0.25s ease-out; }
        @keyframes expand { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 500px; } }

        /* ATTENDANCE DOSSIER STYLES */
        .attendance-dossier-wrapper { display: flex; flex-direction: column; gap: 12px; }
        .dossier-controls { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-radius: 12px; }
        .date-nav { display: flex; align-items: center; gap: 16px; }
        .date-nav button { background: white; border: 1px solid #e2e8f0; border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
        .nav-label { font-size: 1rem; color: #334155; }
        .nav-label strong { color: var(--primary); }
        .dossier-actions { display: flex; align-items: center; gap: 12px; }
        .dossier-legend { display: flex; gap: 10px; font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .leg-item { display: flex; align-items: center; gap: 4px; }
        .dossier-divider { width: 1px; height: 20px; background: #e2e8f0; }
        .export-pdf-btn { padding: 6px 14px; background: white; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.75rem; font-weight: 800; color: var(--text-dim); cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .export-pdf-btn:hover { border-color: var(--primary); color: var(--primary); background: #fff1f2; }
        .spin-icon { animation: spin 2s linear infinite; color: var(--primary); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .dossier-matrix-wrapper { border-radius: 12px; overflow: hidden; background: white; border: 1px solid #f1f5f9; }
        .matrix-scroll-area { overflow-x: auto; width: 100%; cursor: grab; user-select: none; }
        .matrix-scroll-area.active-dragging { cursor: grabbing !important; }
        .dossier-table { width: 100%; border-collapse: collapse; min-width: 900px; }
        .dossier-table th { background: #f8fafc; padding: 10px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #f1f5f9; text-align: center; }
        .sticky-col { position: sticky; left: 0; background: #f8fafc; z-index: 10; border-right: 2px solid #f1f5f9; width: 65px; }
        .dossier-table tr:nth-child(even) .sticky-col { background: #fcfcfc; }
        .d-tile { padding: 6px !important; text-align: center; }
        .d-num { font-size: 1.1rem; font-weight: 800; color: #1e293b; line-height: 1; }
        .d-name { font-size: 0.55rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
        .is-holiday { background: #fff1f2 !important; border-right-color: #fee2e2 !important; }
        .is-holiday .d-num { color: #ef4444; }
        .status-cell { border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f8fafc; height: 50px; text-align: center; vertical-align: middle; transition: background 0.15s; }
        .status-cell.is-present { background: #bbf7d0 !important; }
        .status-cell.is-absent { background: #fecaca !important; }
        .cell-content { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 2px; }
        .p-sub-mini { font-size: 0.55rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .status-cell.is-present .p-sub-mini { color: #047857; }
        .status-cell.is-absent .p-sub-mini { color: #b91c1c; }
        .status-orb { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .status-orb.present { color: #047857; }
        .status-orb.absent { color: #b91c1c; }
        .p-null { font-size: 0.7rem; color: #f1f5f9; font-weight: 900; }
        .no-p { color: #f8fafc; font-weight: 200; font-size: 1.2rem; }
      `}</style>
    </div>
  );
};

const EditModalContent = ({ formData, setFormData, setSelectedFile, previewUrl, batches }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  return (
    <div className="modal-form">
      <div className="avatar-side-section">
        <div className="preview-container"><div className="preview-circle">{previewUrl ? <img src={previewUrl} alt="Preview" /> : <User size={32} />}</div><span className="mini-label">Photo</span></div>
        <div className="avatar-inputs">
          <div className="input-row"><label>Upload New</label><input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} accept="image/*" className="file-input-compact" /></div>
          <div className="input-row"><label>Or Image URL</label><input name="avatarUrl" value={formData.avatarUrl || ''} onChange={handleInputChange} placeholder="https://..." className="url-input-compact" /></div>
        </div>
      </div>
      <div className="form-section">
        <h3>Identity</h3>
        <div className="section-grid">
          <div className="form-group"><label>Name *</label><input name="name" value={formData.name || ''} onChange={handleInputChange} required /></div>
          <div className="form-group"><label>Age</label><input type="number" name="age" value={formData.age || ''} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Place</label><input name="place" value={formData.place || ''} onChange={handleInputChange} /></div>
          <div className="form-group">
            <label>Blood Group</label>
            <select name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleInputChange}>
              <option value="">Select</option>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Full Address</label>
          <textarea name="address" value={formData.address || ''} onChange={handleInputChange} rows="2" />
        </div>
      </div>

      <div className="form-section">
        <h3>Academic Info</h3>
        <div className="section-grid">
          <div className="form-group">
            <label>Admission Batch *</label>
            <select name="batchId" value={formData.batchId || ''} onChange={handleInputChange} required>
              <option value="">Select Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Current School Class</label>
            <input name="schoolClass" value={formData.schoolClass || ''} onChange={handleInputChange} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Guardian & Family</h3>
        <div className="section-grid">
          <div className="form-group"><label>Guardian Name *</label><input name="guardianName" value={formData.guardianName || ''} onChange={handleInputChange} required /></div>
          <div className="form-group"><label>Mother's Name</label><input name="motherName" value={formData.motherName || ''} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Father's Job</label><input name="fatherJob" value={formData.fatherJob || ''} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Guardian Phone *</label><input name="guardianPhone" value={formData.guardianPhone || ''} onChange={handleInputChange} required /></div>
          <div className="form-group"><label>Guardian WhatsApp</label><input name="guardianWhatsApp" value={formData.guardianWhatsApp || ''} onChange={handleInputChange} /></div>
        </div>
      </div>

      <div className="form-section">
        <h3>Student Contact</h3>
        <div className="section-grid">
          <div className="form-group"><label>Student Phone</label><input name="studentPhone" value={formData.studentPhone || ''} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Student WhatsApp</label><input name="studentWhatsApp" value={formData.studentWhatsApp || ''} onChange={handleInputChange} /></div>
        </div>
      </div>

      <div className="form-section">
        <h3>Login Credentials</h3>
        <div className="section-grid">
          <div className="form-group"><label>Custom Username</label><input name="username" value={formData.username || ''} onChange={handleInputChange} placeholder="Default: Name" /></div>
          <div className="form-group"><label>Student Password</label><input name="password" value={formData.password || ''} onChange={handleInputChange} placeholder="Institutional Default" /></div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
