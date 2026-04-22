import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, GraduationCap, Calendar, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import '../styles/CommandPalette.css';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { students, teachers, batches } = useData();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      Promise.resolve().then(() => setQuery(''));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results = [];
  const lowerQuery = query.toLowerCase();

  if (query.length > 0) {
    students.forEach((s) => {
      if (s.name.toLowerCase().includes(lowerQuery) || (s.place && s.place.toLowerCase().includes(lowerQuery))) {
        results.push({ type: 'Student', icon: <GraduationCap size={16} />, title: s.name, sub: s.place || 'No Place', action: () => navigate(`/dashboard/students?studentId=${s.id}`) });
      }
    });

    teachers.forEach((t) => {
      if (t.name.toLowerCase().includes(lowerQuery) || (t.department && t.department.toLowerCase().includes(lowerQuery))) {
        results.push({ type: 'Teacher', icon: <User size={16} />, title: t.name, sub: t.department || 'Staff', action: () => navigate(`/dashboard/teachers?teacherId=${t.id}`) });
      }
    });

    batches.forEach((b) => {
      if (b.batchName.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'Batch', icon: <Calendar size={16} />, title: b.batchName, sub: 'Timetable', action: () => navigate(`/dashboard/batches?batchId=${b.id}`) });
      }
    });
  }

  return (
    <div className="cmd-overlay" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-header">
          <Search size={18} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search students, teachers, or batches..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="cmd-close" onClick={() => setIsOpen(false)}><X size={18} /></button>
        </div>
        
        {query.length > 0 && (
          <div className="cmd-results">
            {results.length > 0 ? (
              results.map((r, i) => (
                <div 
                  key={i} 
                  className="cmd-item" 
                  onClick={() => {
                    r.action();
                    setIsOpen(false);
                  }}
                >
                  <div className="cmd-item-icon">{r.icon}</div>
                  <div className="cmd-item-info">
                    <span className="cmd-item-title">{r.title}</span>
                    <span className="cmd-item-sub">{r.type} &bull; {r.sub}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="cmd-empty">No results found for "{query}"</div>
            )}
          </div>
        )}
        <div className="cmd-footer">
          <span>Search functionality</span>
          <span>Press <strong>Esc</strong> to close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
