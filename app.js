// Import required modules
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initial data
let subjects = [
    { id: 1, name: 'Data Structures', hasLab: true, semester: 3, roomPreference: 'Lab 1', weeklyLectures: 3, weeklyLabs: 1, credits: 4 },
    { id: 2, name: 'Database Management', hasLab: true, semester: 4, roomPreference: 'Lab 2', weeklyLectures: 3, weeklyLabs: 1, credits: 4 },
    { id: 4, name: 'Operating Systems', hasLab: true, semester: 4, roomPreference: 'Lab 1', weeklyLectures: 3, weeklyLabs: 1, credits: 4 },
    { id: 51, name: 'Software Engineering', hasLab: true, semester: 5, roomPreference: 'Room 201', weeklyLectures: 3, weeklyLabs: 1, credits: 3 },
    { id: 52, name: 'Computer Networks', hasLab: true, semester: 5, roomPreference: 'Lab 3', weeklyLectures: 4, weeklyLabs: 1, credits: 4 },
    { id: 53, name: 'Analysis & Design of an algorithm', hasLab: true, semester: 5, roomPreference: 'Lab 2', weeklyLectures: 4, weeklyLabs: 1, credits: 4 },
    { id: 54, name: 'Python for Data Science', hasLab: true, semester: 5, roomPreference: 'Lab 1', weeklyLectures: 2, weeklyLabs: 1, credits: 4 },
    { id: 55, name: 'PE', hasLab: false, semester: 5, roomPreference: 'Lab 1', weeklyLectures: 3, weeklyLabs: 0, credits: 4 },
    { id: 56, name: 'IPDC', hasLab: false, semester: 5, roomPreference: 'Lab 1', weeklyLectures: 2, weeklyLabs: 0, credits: 4 },
    { id: 57, name: 'DE-II', hasLab: true, semester: 5, roomPreference: 'Lab 1', weeklyLectures: 0, weeklyLabs: 1, credits: 4 },
];

let faculty = [
    { id: 1, name: 'JMS', subjects: [53, 57], maxHours: 24, currentHours: 0 },
    { id: 2, name: 'RKS', subjects: [56, 53], maxHours: 24, currentHours: 0 },
    { id: 3, name: 'Jay Shah', subjects: [55], maxHours: 3, currentHours: 0 },
    { id: 4, name: 'NRD', subjects: [52], maxHours: 24, currentHours: 0 },
    { id: 5, name: 'JMR', subjects: [52], maxHours: 24, currentHours: 0 },
    { id: 6, name: 'AHR', subjects: [57, 51], maxHours: 24, currentHours: 0 },
    { id: 7, name: 'AND', subjects: [51], maxHours: 24, currentHours: 0 },
    { id: 8, name: 'NBS', subjects: [54], maxHours: 24, currentHours: 0 },
    { id: 9, name: 'KSP', subjects: [54], maxHours: 2, currentHours: 0 },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const slots = [
    { id: 1, time: '9:00-10:00' },
    { id: 2, time: '10:00-11:00' },
    { id: 3, time: '11:00-12:00' },
    { id: 4, time: '12:00-1:00' },
    { id: 5, time: '2:00-4:00' }
];

let timetables = {};

// Initialize timetables for semesters
const initializeTimetables = (semesters) => {
    const newTimetables = {};
    semesters.forEach((semester) => {
        newTimetables[semester] = { A: {}, B: {} }; // Timetables for divisions A and B
        ['A', 'B'].forEach((division) => {
            days.forEach((day) => {
                newTimetables[semester][division][day] = {};
                slots.forEach((slot) => {
                    newTimetables[semester][division][day][slot.time] = null;
                });
            });
        });
    });
    return newTimetables;
};


// Routes
app.get('/', (req, res) => {
    res.render('index', { subjects, faculty, timetables, slots, days, error: null });
});

app.post('/add-subject', (req, res) => {
    const { name, hasLab, semester, roomPreference, weeklyLectures, weeklyLabs, credits } = req.body;
    if (!name) {
        return res.render('index', { subjects, faculty, timetables, error: 'Subject name is required.' });
    }
    const id = subjects.length + 1;
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
    if (!name) {
        return res.render('index', { subjects, faculty, timetables, error: 'Faculty name is required.' });
    }
    const id = faculty.length + 1;
    const parsedSubjects = Array.isArray(subjectIds)
        ? subjectIds.map((id) => parseInt(id))
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

app.post('/generate-timetable', (req, res) => {
    try {
        timetables = initializeTimetables([3, 4, 5]); // Semesters with divisions
        const semesterSubjects = {};

        // Group subjects by semester
        subjects.forEach((subject) => {
            if (!semesterSubjects[subject.semester]) {
                semesterSubjects[subject.semester] = [];
            }
            semesterSubjects[subject.semester].push(subject);
        });

        // Assign slots for each semester and division
        Object.keys(semesterSubjects).forEach((semester) => {
            const semesterTimetable = timetables[semester];
            const subjectsQueue = [...semesterSubjects[semester]];

            // Assign labs first
            ['A', 'B'].forEach((division) => {
                subjectsQueue.forEach((subject) => {
                    if (subject.weeklyLabs > 0) {
                        let labsAssigned = 0;
                        days.forEach((day) => {
                            if (labsAssigned >= subject.weeklyLabs) return;
                            for (let i = 0; i < slots.length - 1; i++) {
                                const slot1 = slots[i];
                                const slot2 = slots[i + 1];

                                // Check if two consecutive slots are free
                                if (
                                    !semesterTimetable[division][day][slot1.time] &&
                                    !semesterTimetable[division][day][slot2.time]
                                ) {
                                    const facultyMember = faculty.find(
                                        (fac) => fac.subjects.includes(subject.id) && fac.currentHours + 2 <= fac.maxHours
                                    );

                                    if (facultyMember) {
                                        semesterTimetable[division][day][slot1.time] = {
                                            subject: subject.name,
                                            type: 'Lab',
                                            facultyName: facultyMember.name,
                                            room: subject.roomPreference,
                                            credits: subject.credits,
                                        };
                                        semesterTimetable[division][day][slot2.time] = {
                                            subject: subject.name,
                                            type: 'Lab',
                                            facultyName: facultyMember.name,
                                            room: subject.roomPreference,
                                            credits: subject.credits,
                                        };
                                        facultyMember.currentHours += 2;
                                        labsAssigned++;
                                        break; // Exit slot loop once assigned
                                    }
                                }
                            }
                        });
                    }
                });
            });

            // Assign lectures
            ['A', 'B'].forEach((division) => {
                subjectsQueue.forEach((subject) => {
                    if (subject.weeklyLectures > 0) {
                        let lecturesAssigned = 0;
                        days.forEach((day) => {
                            if (lecturesAssigned >= subject.weeklyLectures) return;
                            slots.forEach((slot) => {
                                if (lecturesAssigned >= subject.weeklyLectures) return;
                                if (!semesterTimetable[division][day][slot.time]) {
                                    const facultyMember = faculty.find(
                                        (fac) => fac.subjects.includes(subject.id) && fac.currentHours + 1 <= fac.maxHours
                                    );

                                    if (facultyMember) {
                                        semesterTimetable[division][day][slot.time] = {
                                            subject: subject.name,
                                            type: 'Lecture',
                                            facultyName: facultyMember.name,
                                            room: subject.roomPreference,
                                            credits: subject.credits,
                                        };
                                        facultyMember.currentHours += 1;
                                        lecturesAssigned++;
                                    }
                                }
                            });
                        });
                    }
                });
            });
        });

        res.redirect('/');
    } catch (error) {
        res.render('index', { subjects, faculty, timetables, error: error.message });
    }
});

app.get('/export/:semester', (req, res) => {
    const semester = parseInt(req.params.semester);
    const timetable = timetables[semester];
    if (!timetable) {
        return res.status(404).send('Timetable not found');
    }

    const csvContent = [
        ['Semester', 'Day', 'Time Slot', 'Subject', 'Type', 'Faculty', 'Room', 'Credits'].join(',')
    ];

    days.forEach((day) => {
        slots.forEach((slot) => {
            const session = timetable[day][slot.time];
            if (session) {
                csvContent.push([
                    semester,
                    day,
                    slot.time,
                    session.subject,
                    session.type,
                    session.facultyName,
                    session.room,
                    session.credits
                ].join(','));
            }
        });
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`timetable-semester-${semester}.csv`);
    res.send(csvContent.join('\n'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
