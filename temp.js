const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initial data structures
const subjects = [
    { id: 1, name: 'Data Structures', hasLab: true, semester: 3, roomPreference: 'Lab 1', weeklyLectures: 3, weeklyLabs: 1, credits: 4 },
    { id: 2, name: 'Database Management', hasLab: true, semester: 4, roomPreference: 'Lab 2', weeklyLectures: 3, weeklyLabs: 1, credits: 4 },
    { id: 4, name: 'Operating Systems', hasLab: true, semester: 4, roomPreference: 'Lab 1', weeklyLectures: 3, weeklyLabs: 1, credits: 4 },
    { id: 51, name: 'Software Engineering', hasLab: true, semester: 5, roomPreference: 'Room 201', weeklyLectures: 3, weeklyLabs: 1, credits: 3 },
    { id: 52, name: 'Computer Networks', hasLab: true, semester: 5, roomPreference: 'Lab 3', weeklyLectures: 4, weeklyLabs: 1, credits: 4 },
    { id: 53, name: 'Analysis & Design of an algorithm', hasLab: true, semester: 5, roomPreference: 'Lab 2', weeklyLectures: 4, weeklyLabs: 1, credits: 4 },
    { id: 54, name: 'Python for Data Science', hasLab: true, semester: 5, roomPreference: 'Lab 1', weeklyLectures: 2, weeklyLabs: 1, credits: 4 },
    { id: 55, name: 'PE', hasLab: false, semester: 5, roomPreference: 'Lab 1', weeklyLectures: 3, weeklyLabs: 0, credits: 4 },
    { id: 56, name: 'IPDC', hasLab: false, semester: 5, roomPreference: 'Lab 1', weeklyLectures: 2, weeklyLabs: 0, credits: 4 },
    { id: 57, name: 'DE-II', hasLab: true, semester: 5, roomPreference: 'Lab 1', weeklyLectures: 0, weeklyLabs: 1, credits: 4 }
];

const faculty = [
    { id: 1, name: 'JMS', subjects: [53, 57], maxHours: 24, currentHours: 0 },
    { id: 2, name: 'RKS', subjects: [56, 53], maxHours: 24, currentHours: 0 },
    { id: 3, name: 'Jay Shah', subjects: [55], maxHours: 3, currentHours: 0 },
    { id: 4, name: 'NRD', subjects: [52], maxHours: 24, currentHours: 0 },
    { id: 5, name: 'JMR', subjects: [52], maxHours: 24, currentHours: 0 },
    { id: 6, name: 'AHR', subjects: [57, 51], maxHours: 24, currentHours: 0 },
    { id: 7, name: 'AND', subjects: [51], maxHours: 24, currentHours: 0 },
    { id: 8, name: 'NBS', subjects: [54], maxHours: 24, currentHours: 0 },
    { id: 9, name: 'KSP', subjects: [54], maxHours: 2, currentHours: 0 }
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const slots = [
    { id: 1, time: '10:00-11:00' },
    { id: 2, time: '11:00-12:00' },
    { id: 3, time: '13:00-14:00' },
    { id: 4, time: '14:00-15:00' },
    { id: 5, time: '15:15-17:15' }
];

const rooms = {
    labs: ['Lab 1', 'Lab 2', 'Lab 3'],
    classrooms: ['Room 201', 'Room 202', 'Room 203']
};

// Timetable data structure
let timetables = {};

// Helper functions
const createEmptyTimeSlot = () => ({
    subject: null,
    faculty: null,
    type: null,
    room: null
});

const createEmptyDaySchedule = () => {
    const daySchedule = {};
    slots.forEach(slot => {
        daySchedule[slot.time] = createEmptyTimeSlot();
    });
    return daySchedule;
};

const createEmptyTimetable = () => {
    const timetable = {};
    days.forEach(day => {
        timetable[day] = createEmptyDaySchedule();
    });
    return timetable;
};

const initializeTimetables = () => {
    const semesters = [3, 4, 5];
    const divisions = ['A', 'B'];
    const newTimetables = {};

    semesters.forEach(semester => {
        newTimetables[semester] = {};
        divisions.forEach(division => {
            newTimetables[semester][division] = createEmptyTimetable();
        });
    });

    return newTimetables;
};

// Check if a slot is available
const isSlotAvailable = (semester, division, day, time) => {
    return !timetables[semester][division][day][time].subject;
};

// Check if faculty is available
const isFacultyAvailable = (facultyName, day, time) => {
    for (const sem in timetables) {
        for (const div of ['A', 'B']) {
            const slot = timetables[sem][div][day][time];
            if (slot.faculty === facultyName) {
                return false;
            }
        }
    }
    return true;
};

// Check if room is available
const isRoomAvailable = (roomName, day, time) => {
    for (const sem in timetables) {
        for (const div of ['A', 'B']) {
            const slot = timetables[sem][div][day][time];
            if (slot.room === roomName) {
                return false;
            }
        }
    }
    return true;
};

// Find available faculty for a subject
const findAvailableFaculty = (subjectId, day, time) => {
    return faculty.find(f => {
        return f.subjects.includes(subjectId) &&
            f.currentHours < f.maxHours &&
            isFacultyAvailable(f.name, day, time);
    });
};

// Schedule a session
const scheduleSession = (semester, division, day, time, subject, facultyMember, type, duration = 1) => {
    const sessionInfo = {
        subject: subject.name,
        faculty: facultyMember.name,
        type: type,
        room: subject.roomPreference
    };

    for (let i = 0; i < duration; i++) {
        const currentSlot = slots[slots.findIndex(s => s.time === time) + i];
        if (!currentSlot) return false;
        timetables[semester][division][day][currentSlot.time] = sessionInfo;
    }

    facultyMember.currentHours += duration;
    return true;
};

// Generate timetable
app.post('/generate-timetable', (req, res) => {
    try {
        // Reset timetables and faculty hours
        timetables = initializeTimetables();
        faculty.forEach(f => f.currentHours = 0);

        // Group subjects by semester
        const semesterSubjects = {};
        subjects.forEach(subject => {
            if (!semesterSubjects[subject.semester]) {
                semesterSubjects[subject.semester] = [];
            }
            semesterSubjects[subject.semester].push(subject);
        });

        // Process each semester
        Object.entries(semesterSubjects).forEach(([semester, subjectList]) => {
            ['A', 'B'].forEach(division => {
                // Schedule labs first (they need 2 consecutive slots)
                subjectList.filter(s => s.hasLab).forEach(subject => {
                    let labsScheduled = 0;
                    while (labsScheduled < subject.weeklyLabs) {
                        let scheduled = false;

                        // Try to schedule in preferred afternoon slots first
                        days.forEach(day => {
                            if (scheduled || labsScheduled >= subject.weeklyLabs) return;

                            // Try slot 5 (2:00-4:00) first for labs
                            const labSlot = slots[4]; // 2:00-4:00 slot
                            const facultyMember = findAvailableFaculty(subject.id, day, labSlot.time);

                            if (facultyMember &&
                                isSlotAvailable(semester, division, day, labSlot.time) &&
                                isRoomAvailable(subject.roomPreference, day, labSlot.time)) {

                                if (scheduleSession(semester, division, day, labSlot.time, subject, facultyMember, 'Lab', 1)) {
                                    scheduled = true;
                                    labsScheduled++;
                                }
                            }
                        });

                        if (!scheduled) break; // If we couldn't schedule, move to next subject
                    }
                });

                // Schedule lectures
                subjectList.forEach(subject => {
                    let lecturesScheduled = 0;
                    while (lecturesScheduled < subject.weeklyLectures) {
                        let scheduled = false;

                        days.forEach(day => {
                            if (scheduled || lecturesScheduled >= subject.weeklyLectures) return;

                            // Try morning slots for lectures
                            for (let slotIndex = 0; slotIndex < 4; slotIndex++) {
                                if (scheduled) break;

                                const slot = slots[slotIndex];
                                const facultyMember = findAvailableFaculty(subject.id, day, slot.time);

                                if (facultyMember &&
                                    isSlotAvailable(semester, division, day, slot.time) &&
                                    isRoomAvailable(subject.roomPreference, day, slot.time)) {

                                    if (scheduleSession(semester, division, day, slot.time, subject, facultyMember, 'Lecture', 1)) {
                                        scheduled = true;
                                        lecturesScheduled++;
                                    }
                                }
                            }
                        });

                        if (!scheduled) break; // If we couldn't schedule, move to next subject
                    }
                });
            });
        });

        res.redirect('/');
    } catch (error) {
        console.error('Timetable generation error:', error);
        res.render('index', {
            subjects,
            faculty,
            timetables,
            slots,
            days,
            error: error.message
        });
    }
});

// Routes
app.get('/', (req, res) => {
    res.render('index', {
        subjects,
        faculty,
        timetables,
        slots,
        days,
        error: null
    });
});

app.post('/add-subject', (req, res) => {
    const { name, hasLab, semester, roomPreference, weeklyLectures, weeklyLabs, credits } = req.body;
    const id = Math.max(...subjects.map(s => s.id)) + 1;

    subjects.push({
        id,
        name,
        hasLab: hasLab === 'on',
        semester: parseInt(semester),
        roomPreference,
        weeklyLectures: parseInt(weeklyLectures),
        weeklyLabs: parseInt(weeklyLabs),
        credits: parseInt(credits)
    });

    res.redirect('/');
});

app.post('/add-faculty', (req, res) => {
    const { name, subjects: subjectIds, maxHours } = req.body;
    const id = Math.max(...faculty.map(f => f.id)) + 1;

    const parsedSubjects = Array.isArray(subjectIds)
        ? subjectIds.map(id => parseInt(id))
        : [parseInt(subjectIds)];

    faculty.push({
        id,
        name,
        subjects: parsedSubjects,
        maxHours: parseInt(maxHours),
        currentHours: 0
    });

    res.redirect('/');
});

// Export functionality
app.get('/export/:semester/:division', (req, res) => {
    const semester = req.params.semester;
    const division = req.params.division;

    if (!timetables[semester] || !timetables[semester][division]) {
        return res.status(404).send('Timetable not found');
    }

    const csvRows = ['Day,Time,Subject,Type,Faculty,Room'];

    days.forEach(day => {
        slots.forEach(slot => {
            const session = timetables[semester][division][day][slot.time];
            if (session.subject) {
                csvRows.push(`${day},${slot.time},${session.subject},${session.type},${session.faculty},${session.room}`);
            }
        });
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`timetable-sem${semester}-div${division}.csv`);
    res.send(csvRows.join('\n'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});