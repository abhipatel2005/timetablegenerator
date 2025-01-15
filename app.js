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
        // Initialize fresh timetables and reset faculty hours
        timetables = initializeTimetables([3, 4, 5]);
        faculty.forEach(f => f.currentHours = 0);

        // Practical rules that humans typically follow
        const rules = {
            maxLecturesPerDay: 2,        // Maximum lectures of same subject per day
            preferredLabSlots: [4],      // Slot indices where labs are preferred (afternoon slots)
            preferredLectureDays: {      // Try to keep lectures on these days
                3: ['Monday', 'Wednesday', 'Friday'],
                4: ['Monday', 'Tuesday', 'Thursday'],
                5: ['Tuesday', 'Wednesday', 'Friday']
            },
            gapBetweenLectures: 1,       // Preferred gap between lectures of same subject
            maxDailyLoad: 6              // Maximum hours per day for students
        };

        // Helper to get subject faculty
        const getSubjectFaculty = (subjectId) => {
            return faculty.filter(f => f.subjects.includes(subjectId))
                .sort((a, b) => a.currentHours - b.currentHours);
        };

        // Helper to check slot availability
        const isSlotAvailable = (semester, division, day, slotTime, duration = 1) => {
            // Check current slot and next slot if duration > 1
            for (let i = 0; i < duration; i++) {
                const slotIndex = slots.findIndex(s => s.time === slotTime);
                const currentSlot = slots[slotIndex + i];
                if (!currentSlot) return false;

                if (timetables[semester][division][day][currentSlot.time]) {
                    return false;
                }
            }
            return true;
        };

        // Helper to check faculty availability
        const isFacultyFree = (facultyMember, day, slotTime, duration = 1) => {
            for (const semester in timetables) {
                for (const division of ['A', 'B']) {
                    for (let i = 0; i < duration; i++) {
                        const slotIndex = slots.findIndex(s => s.time === slotTime);
                        const currentSlot = slots[slotIndex + i];
                        if (!currentSlot) return false;

                        const session = timetables[semester][division][day][currentSlot.time];
                        if (session && session.facultyName === facultyMember.name) {
                            return false;
                        }
                    }
                }
            }
            return true;
        };

        // Helper to get daily load
        const getDailyLoad = (semester, division, day) => {
            return Object.values(timetables[semester][division][day])
                .filter(session => session !== null)
                .length;
        };

        // Helper to count subject sessions on a day
        const getSubjectSessionsOnDay = (semester, division, day, subjectName, type) => {
            return Object.values(timetables[semester][division][day])
                .filter(session => session &&
                    session.subject === subjectName &&
                    session.type === type)
                .length;
        };

        // Process each semester
        Object.entries(semesterSubjects).forEach(([semester, semSubjects]) => {
            ['A', 'B'].forEach(division => {
                // Step 1: Schedule Labs First (they're more constrained)
                semSubjects.filter(subject => subject.weeklyLabs > 0)
                    .forEach(subject => {
                        let labsScheduled = 0;

                        // Try preferred lab slots first
                        while (labsScheduled < subject.weeklyLabs) {
                            let scheduled = false;
                            const availableFaculty = getSubjectFaculty(subject.id);

                            // Try each day
                            for (const day of days) {
                                if (scheduled) break;

                                // Check if we can schedule on this day
                                const dailyLoad = getDailyLoad(semester, division, day);
                                if (dailyLoad + 2 > rules.maxDailyLoad) continue;

                                // Try preferred lab slots first, then others
                                const allSlots = [...rules.preferredLabSlots,
                                ...slots.map((_, idx) => idx)
                                    .filter(idx => !rules.preferredLabSlots.includes(idx))];

                                for (const slotIndex of allSlots) {
                                    if (scheduled) break;
                                    const slot = slots[slotIndex];
                                    if (!slot) continue;

                                    for (const facultyMember of availableFaculty) {
                                        if (facultyMember.currentHours + 2 > facultyMember.maxHours) continue;

                                        if (isSlotAvailable(semester, division, day, slot.time, 2) &&
                                            isFacultyFree(facultyMember, day, slot.time, 2)) {

                                            // Schedule the lab (2-hour block)
                                            const labInfo = {
                                                subject: subject.name,
                                                type: 'Lab',
                                                facultyName: facultyMember.name,
                                                room: subject.roomPreference,
                                                credits: subject.credits
                                            };

                                            const nextSlot = slots[slotIndex + 1];
                                            timetables[semester][division][day][slot.time] = labInfo;
                                            timetables[semester][division][day][nextSlot.time] = labInfo;

                                            facultyMember.currentHours += 2;
                                            labsScheduled++;
                                            scheduled = true;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (!scheduled) break; // If we couldn't schedule, move to next subject
                        }
                    });

                // Step 2: Schedule Lectures
                semSubjects.forEach(subject => {
                    let lecturesScheduled = 0;

                    while (lecturesScheduled < subject.weeklyLectures) {
                        let scheduled = false;
                        const availableFaculty = getSubjectFaculty(subject.id);

                        // Get preferred days for this semester
                        const preferredDays = rules.preferredLectureDays[semester] || days;
                        const allDays = [...preferredDays,
                        ...days.filter(d => !preferredDays.includes(d))];

                        // Try each day
                        for (const day of allDays) {
                            if (scheduled) break;

                            // Check daily load
                            const dailyLoad = getDailyLoad(semester, division, day);
                            if (dailyLoad >= rules.maxDailyLoad) continue;

                            // Check subject sessions on this day
                            const subjectSessions = getSubjectSessionsOnDay(
                                semester, division, day, subject.name, 'Lecture'
                            );
                            if (subjectSessions >= rules.maxLecturesPerDay) continue;

                            // Try each slot
                            for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
                                if (scheduled) break;
                                const slot = slots[slotIndex];

                                for (const facultyMember of availableFaculty) {
                                    if (facultyMember.currentHours + 1 > facultyMember.maxHours) continue;

                                    if (isSlotAvailable(semester, division, day, slot.time) &&
                                        isFacultyFree(facultyMember, day, slot.time)) {

                                        // Schedule the lecture
                                        timetables[semester][division][day][slot.time] = {
                                            subject: subject.name,
                                            type: 'Lecture',
                                            facultyName: facultyMember.name,
                                            room: subject.roomPreference,
                                            credits: subject.credits
                                        };

                                        facultyMember.currentHours += 1;
                                        lecturesScheduled++;
                                        scheduled = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (!scheduled) break; // If we couldn't schedule, move to next subject
                    }
                });
            });
        });

        // Validation and logging
        const unscheduledSessions = [];
        subjects.forEach(subject => {
            const semester = subject.semester;
            ['A', 'B'].forEach(division => {
                let scheduledLectures = 0;
                let scheduledLabs = 0;

                days.forEach(day => {
                    Object.values(timetables[semester][division][day]).forEach(session => {
                        if (session && session.subject === subject.name) {
                            if (session.type === 'Lecture') scheduledLectures++;
                            if (session.type === 'Lab') scheduledLabs += 0.5; // Each lab slot counts as 0.5 since they're double periods
                        }
                    });
                });

                if (scheduledLectures < subject.weeklyLectures || scheduledLabs < subject.weeklyLabs) {
                    unscheduledSessions.push({
                        semester,
                        division,
                        subject: subject.name,
                        required: {
                            lectures: subject.weeklyLectures,
                            labs: subject.weeklyLabs
                        },
                        scheduled: {
                            lectures: scheduledLectures,
                            labs: scheduledLabs
                        }
                    });
                }
            });
        });

        if (unscheduledSessions.length > 0) {
            console.warn('Unscheduled sessions:', unscheduledSessions);
        }

        res.redirect('/');
    } catch (error) {
        console.error('Timetable generation error:', error);
        res.render('index', {
            subjects,
            faculty,
            timetables,
            slots,
            days,
            error: 'Failed to generate timetable: ' + error.message
        });
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
