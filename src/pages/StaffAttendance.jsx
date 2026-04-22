import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
import { Search, Calendar, Users, CheckCircle2, XCircle, Info, ChevronRight } from 'lucide-react';
import { useHeader } from '../hooks/useHeader';
import { useData } from '../context/DataContext';

import { getRole, ROLES } from '../services/auth';




const StaffAttendance = () => {
  const { setHeaderAction } = useHeader();
  const { teachers } = useData();

  const scrollRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);


  const role = getRole();
  const [selectedDate, setSelectedDate] = useState(() => {
    if (getRole() === ROLES.TEACHER) return new Date().toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  });



  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [currentMonth, setCurrentMonth] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [monthlyData, setMonthlyData] = useState({});
  const [periods, setPeriods] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');



  useEffect(() => {
    const fetchPeriods = async () => {
      const q = query(collection(db, 'staff_periods'), orderBy('startTime', 'asc'));
      const snap = await getDocs(q);
      setPeriods(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (viewMode === 'daily') {
      Promise.resolve().then(() => setLoading(true));
      const docRef = doc(db, 'staff_attendance', selectedDate);
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          setAttendanceData(snap.data().records || {});
        } else {
          setAttendanceData({});
        }
        setLoading(false);
      });
      return () => unsub();
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (viewMode === 'monthly') {
      Promise.resolve().then(() => setLoading(true));

      const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}`;
      const nextMonthStr = currentMonth.month === 11 
        ? `${currentMonth.year + 1}-01` 
        : `${currentMonth.year}-${String(currentMonth.month + 2).padStart(2, '0')}`;

      const q = query(
        collection(db, 'staff_attendance'),
        where('__name__', '>=', monthStr),
        where('__name__', '<', nextMonthStr)
      );
      
      const unsub = onSnapshot(q, (snap) => {
        const dataMap = {};
        snap.docs.forEach(d => {
          dataMap[d.id] = d.data().records || {};
        });
        setMonthlyData(dataMap);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [currentMonth, viewMode]);


  useEffect(() => {
    setHeaderAction(
      <div className="header-actions-group">
        <div className="view-toggle glass">
          <button className={viewMode === 'daily' ? 'active' : ''} onClick={() => setViewMode('daily')}>Daily</button>
          <button className={viewMode === 'monthly' ? 'active' : ''} onClick={() => setViewMode('monthly')}>Monthly</button>
        </div>
        
        {role !== ROLES.TEACHER && viewMode === 'daily' && (
          <div className="date-selector-mini glass">
            <Calendar size={14} />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
            />
          </div>
        )}

        {viewMode === 'monthly' && (
          <div className="month-selector-mini glass">
             <button onClick={() => setCurrentMonth(prev => prev.month === 0 ? { month: 11, year: prev.year - 1 } : { ...prev, month: prev.month - 1 })}>
               <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
             </button>
             <span>{new Date(currentMonth.year, currentMonth.month).toLocaleString('default', { month: 'short' })} {currentMonth.year}</span>
             <button onClick={() => setCurrentMonth(prev => prev.month === 11 ? { month: 0, year: prev.year + 1 } : { ...prev, month: prev.month + 1 })}>
               <ChevronRight size={14} />
             </button>
          </div>
        )}
      </div>


    );
    return () => setHeaderAction(null);
  }, [selectedDate, setHeaderAction, viewMode, currentMonth, role]);


  const handleMouseDown = (e) => {
    if (viewMode !== 'monthly') return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const filteredTeachers = useMemo(() => {

    return teachers.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [teachers, searchTerm]);



  return (
    <div className="staff-attendance-page fadeIn">
      <div className="staff-attendance-container">
        <div className="search-strip-staff glass">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search teachers by name or department..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {periods.length === 0 ? (
          <div className="empty-state-card glass">
            <Info size={40} className="dim-icon" />
            <h3>No Staff Sessions Defined</h3>
            <p>Admin must define staff work periods in Admin Management to track attendance.</p>
          </div>
        ) : loading ? (
          <div className="loader">Hydrating Staff Records...</div>
        ) : viewMode === 'daily' ? (
          <div className="attendance-list-wrapper">

              <div className="list-head table-header-row">
                 <div className="h-name">Teacher Name</div>
                 {periods.map(p => (
                   <div key={p.id} className="h-period">{p.name}</div>
                 ))}
              </div>

              <div className="list-body">
                {filteredTeachers.length === 0 ? (
                  <div className="empty-state">No teachers found matching your search.</div>
                ) : (
                  filteredTeachers.map(teacher => (
                    <div key={teacher.id} className="teacher-record-row glass">
                      <div className="t-info">
                        <div className="t-avatar">
                          {teacher.avatarUrl ? <img src={teacher.avatarUrl} alt="" /> : teacher.name.charAt(0)}
                        </div>
                        <div className="t-meta">
                          <span className="t-name">{teacher.name}</span>
                          <span className="t-dept">{teacher.department || 'Staff'}</span>
                        </div>
                      </div>

                      <div className="t-attendance-cells" style={{ flex: periods.length }}>
                        {periods.map(period => {
                          const status = attendanceData[teacher.id]?.[period.id];
                          return (
                            <div key={period.id} className="status-cell">
                               <span className="period-label-mobile">{period.name}:</span>
                               {status === 'present' ? (
                                 <div className="status-tag present"><CheckCircle2 size={14} /> <span>Present</span></div>
                               ) : status === 'absent' ? (
                                 <div className="status-tag absent"><XCircle size={14} /> <span>Absent</span></div>
                               ) : (
                                 <span className="no-status">--</span>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="monthly-matrix-wrapper glass">
              <div 
                className={`matrix-scroll-container ${isDragging ? 'dragging' : ''}`}
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                <table className="monthly-table">
                  <thead>
                    <tr>
                      <th className="sticky-col">Staff</th>
                      {Array.from({ length: new Date(currentMonth.year, currentMonth.month + 1, 0).getDate() }, (_, i) => (
                        <th key={i+1}>{i+1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map(teacher => (
                      <tr key={teacher.id}>
                        <td className="sticky-col">
                          <div className="staff-cell-mini">
                            <span className="s-name">{teacher.name}</span>
                            <span className="s-dept">{teacher.department || 'Staff'}</span>
                          </div>
                        </td>
                        {Array.from({ length: new Date(currentMonth.year, currentMonth.month + 1, 0).getDate() }, (_, i) => {
                          const day = i + 1;
                          const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayData = monthlyData[dateStr]?.[teacher.id] || {};
                          
                          const totalPeriods = periods.length;
                          const presentCount = Object.values(dayData).filter(s => s === 'present').length;
                          const absentCount = Object.values(dayData).filter(s => s === 'absent').length;

                          const isFullPresent = presentCount === totalPeriods && totalPeriods > 0;
                          const isPartialPresent = presentCount > 0 && presentCount < totalPeriods;
                          const isFullAbsent = absentCount > 0 && presentCount === 0;
                          
                          let statusClass = 'none';
                          let title = 'No Record';
                          if (isFullPresent) { statusClass = 'present-full'; title = `Present in all ${totalPeriods} sessions`; }
                          else if (isPartialPresent) { statusClass = 'present-partial'; title = `Present in ${presentCount}/${totalPeriods} sessions`; }
                          else if (isFullAbsent) { statusClass = 'absent'; title = 'Absent in marked sessions'; }

                          return (
                            <td key={day} className="day-cell">
                               <div className={`status-dot ${statusClass}`} title={title}></div>
                            </td>
                          );

                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

        )}


      </div>

      <style>{`
        .staff-attendance-page { padding: var(--m-padding); max-width: 1400px; margin: 0 auto; }
        .search-strip-staff { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; background: white; border: 1px solid var(--border-color); }
        .search-strip-staff input { flex: 1; border: none; background: transparent; font-size: 0.9rem; font-weight: 500; outline: none; }
        .search-icon { color: #94a3b8; }

        .date-selector-mini { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 8px; background: white; border: 1px solid #e2e8f0; font-size: 0.8rem; color: #64748b; }
        .date-selector-mini input { border: none; background: transparent; font-weight: 700; color: #334155; outline: none; }

        .attendance-list-wrapper { display: flex; flex-direction: column; gap: 12px; }
        .list-head { display: flex; padding: 12px 20px; font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; }
        .h-name { flex: 2; }
        .h-period { flex: 1; text-align: center; }

        .teacher-record-row { display: flex; align-items: center; padding: 12px 20px; background: white; border-radius: 12px; border: 1px solid #f1f5f9; transition: all 0.2s; }
        .teacher-record-row:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        
        .t-info { flex: 2; display: flex; align-items: center; gap: 12px; min-width: 0; }
        .t-avatar { width: 40px; height: 40px; border-radius: 10px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--primary); overflow: hidden; flex-shrink: 0; }
        .t-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .t-meta { display: flex; flex-direction: column; min-width: 0; }
        .t-name { font-size: 0.9rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .t-dept { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }

        .t-attendance-cells { display: flex; }
        .status-cell { flex: 1; display: flex; justify-content: center; align-items: center; }
        .period-label-mobile { display: none; }

        .status-tag { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }
        .status-tag.present { background: #ecfdf5; color: #059669; }
        .status-tag.absent { background: #fef2f2; color: #dc2626; }
        .no-status { color: #cbd5e1; font-weight: 600; font-size: 0.8rem; }

        @media (max-width: 768px) {
          .list-head { display: flex; padding: 10px; border-bottom: 2px solid #eef2f6; background: #f8fafc; position: sticky; top: 0; z-index: 10; }

          .h-name { flex: 1.5; font-size: 0.75rem; color: #475569; font-weight: 800; }
          .h-period { flex: 1; font-size: 0.75rem; color: #475569; font-weight: 800; }
          
          .teacher-record-row { padding: 10px; gap: 4px; border-radius: 0; border-left: none; border-right: none; border-bottom: 1px solid #f1f5f9; }
          .t-info { flex: 1.5; gap: 8px; }
          .t-avatar { width: 32px; height: 32px; font-size: 0.8rem; }
          .t-name { font-size: 0.85rem; font-weight: 700; color: #1e293b; }
          .t-dept { font-size: 0.65rem; color: #64748b; font-weight: 600; }

          .t-attendance-cells { flex: inherit; display: flex; flex: inherit; gap: 0; }
          .status-cell { flex: 1; }
          .period-label-mobile { display: none; }
          
          .status-tag { padding: 4px 6px; font-size: 0.6rem; width: fit-content; }
          .status-tag span { display: none; } 
          .status-tag svg { margin: 0; }

          /* Header title visibility fix */
          .date-selector-mini { padding: 4px 6px; gap: 4px; }
          .date-selector-mini input { font-size: 0.7rem; width: 80px; }
          .date-selector-mini svg { width: 12px; height: 12px; }

          .search-strip-staff { padding: 8px 12px; margin-bottom: 12px; }
          .search-strip-staff input { font-size: 0.8rem; }
          
          .view-toggle button { padding: 4px 10px; font-size: 0.65rem; }
          .month-selector-mini { padding: 3px 8px; gap: 6px; font-size: 0.7rem; }
          .month-selector-mini button { width: 20px; height: 20px; }
        }

        .view-toggle { 
          display: flex; 
          padding: 3px; 
          border-radius: 10px; 
          background: #f1f5f9; 
          border: 1px solid #e2e8f0;
          margin-right: 4px;
        }
        .view-toggle button { 
          padding: 6px 14px; 
          border-radius: 7px; 
          font-size: 0.75rem; 
          font-weight: 700; 
          color: #64748b; 
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .view-toggle button.active { 
          background: white; 
          color: var(--primary); 
          box-shadow: 0 2px 8px rgba(0,0,0,0.08); 
        }

        .month-selector-mini { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          padding: 5px 12px; 
          border-radius: 10px; 
          font-size: 0.8rem; 
          font-weight: 700; 
          color: #1e293b; 
          border: 1px solid #e2e8f0; 
          background: white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .month-selector-mini button { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          width: 24px; 
          height: 24px; 
          color: #94a3b8; 
          border-radius: 50%;
          transition: all 0.2s;
        }
        .month-selector-mini button:hover { 
          background: #f8fafc;
          color: var(--primary); 
        }

        .header-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .monthly-matrix-wrapper { border-radius: 12px; background: white; border: 1px solid #f1f5f9; overflow: hidden; margin-top: 10px; box-shadow: var(--shadow); }
        .matrix-scroll-container { 
          overflow-x: auto !important; 
          width: 100%; 
          border-radius: 12px; 
          scrollbar-width: thin !important; 
          -ms-overflow-style: auto !important; 
          cursor: grab;
          user-select: none;
        }
        .matrix-scroll-container.dragging {
          cursor: grabbing;
        }
        .matrix-scroll-container::-webkit-scrollbar { 
          display: block !important; 
          height: 6px !important; 
        }
        
        @media (max-width: 768px) {
          .matrix-scroll-container::-webkit-scrollbar { 
            display: none !important; 
          }
          .matrix-scroll-container {
            scrollbar-width: none !important;
          }
        }

        .matrix-scroll-container::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .monthly-table { width: 100%; border-collapse: collapse; min-width: 1200px; }
        .monthly-table th { padding: 14px 8px; font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f8fafc; background: #f8fafc; }
        .monthly-table td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; text-align: center; }
        .monthly-table .sticky-col { position: sticky; left: 0; background: white; z-index: 5; border-right: 2px solid #f1f5f9; text-align: left; width: 180px; padding-left: 16px; }
        .monthly-table th.sticky-col { background: #f8fafc; z-index: 6; }
        
        .staff-cell-mini { display: flex; flex-direction: column; min-width: 0; }
        .staff-cell-mini .s-name { font-size: 0.85rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .staff-cell-mini .s-dept { font-size: 0.65rem; color: #94a3b8; font-weight: 600; }

        .day-cell { min-width: 32px; }
        .status-dot { width: 9px; height: 9px; border-radius: 50%; margin: 0 auto; transition: transform 0.2s; }
        .status-dot:hover { transform: scale(1.3); }
        .status-dot.present-full { background: #10b981; box-shadow: 0 0 0 2px #ecfdf5; }
        .status-dot.present-partial { background: white; border: 2.5px solid #10b981; }
        .status-dot.absent { background: #ef4444; box-shadow: 0 0 0 2px #fef2f2; }
        .status-dot.none { background: #f1f5f9; }

      `}</style>


    </div>
  );
};

export default StaffAttendance;
