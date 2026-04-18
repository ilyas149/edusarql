import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { DataContext } from './DataContext';

export const DataProvider = ({ children }) => {
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState({
        students: true,
        teachers: true,
        batches: true,
        subjects: true,
        periods: true,
        examTypes: true,
        exams: true
    });

    const [examTypes, setExamTypes] = useState([]);
    const [exams, setExams] = useState([]);

    useEffect(() => {
        // Real-time Students
        const qStudents = query(collection(db, 'students'), orderBy('name'));
        const unsubStudents = onSnapshot(qStudents, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(data);
            setLoading(prev => ({ ...prev, students: false }));
        }, (err) => {
            console.error("Students Sync Error:", err);
            setLoading(prev => ({ ...prev, students: false }));
        });

        // Real-time Teachers
        const qTeachers = query(collection(db, 'teachers'), orderBy('name'));
        const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTeachers(data);
            setLoading(prev => ({ ...prev, teachers: false }));
        }, (err) => {
            console.error("Teachers Sync Error:", err);
            setLoading(prev => ({ ...prev, teachers: false }));
        });

        // Real-time Batches
        const qBatches = query(collection(db, 'batches'), orderBy('batchName'));
        const unsubBatches = onSnapshot(qBatches, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBatches(data);
            setLoading(prev => ({ ...prev, batches: false }));
        }, (err) => {
            console.error("Batches Sync Error:", err);
            setLoading(prev => ({ ...prev, batches: false }));
        });

        // Real-time Subjects
        const qSubjects = query(collection(db, 'subjects'), orderBy('name'));
        const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubjects(data);
            setLoading(prev => ({ ...prev, subjects: false }));
        }, (err) => {
            console.error("Subjects Sync Error:", err);
            setLoading(prev => ({ ...prev, subjects: false }));
        });

        // Real-time Periods
        const qPeriods = query(collection(db, 'periods'), orderBy('startTime', 'asc'));
        const unsubPeriods = onSnapshot(qPeriods, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPeriods(data);
            setLoading(prev => ({ ...prev, periods: false }));
        }, (err) => {
            console.error("Periods Sync Error:", err);
            setLoading(prev => ({ ...prev, periods: false }));
        });

        // Real-time Exam Types
        const qExamTypes = query(collection(db, 'exam_types'), orderBy('year', 'desc'));
        const unsubExamTypes = onSnapshot(qExamTypes, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExamTypes(data);
            setLoading(prev => ({ ...prev, examTypes: false }));
        }, (err) => {
            console.error("ExamTypes Sync Error:", err);
            setLoading(prev => ({ ...prev, examTypes: false }));
        });

        // Real-time Exams (Sessions)
        const qExams = query(collection(db, 'exams'), orderBy('updatedAt', 'desc'));
        const unsubExams = onSnapshot(qExams, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExams(data);
            setLoading(prev => ({ ...prev, exams: false }));
        }, (err) => {
            console.error("Exams Sync Error:", err);
            setLoading(prev => ({ ...prev, exams: false }));
        });

        return () => {
            unsubStudents();
            unsubTeachers();
            unsubBatches();
            unsubSubjects();
            unsubPeriods();
            unsubExamTypes();
            unsubExams();
        };
    }, []);

    const isAppLoading = loading.students || loading.teachers || loading.batches || loading.subjects || loading.periods || loading.examTypes || loading.exams;

    const value = {
        students,
        teachers,
        batches,
        subjects,
        periods,
        examTypes,
        exams,
        loading,
        isAppLoading
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
