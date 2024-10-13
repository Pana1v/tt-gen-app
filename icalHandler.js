// icalHandler.js

// Load the ics.js library
const ics = require('./libs/ics');

// Export the generateICalFile function so it can be used in renderer.js
function generateICalFile() {
    const year = document.getElementById('year').value;
    const batch = document.getElementById('batch').value;

    if (!year || !batch) {
        alert("Please select both year and batch.");
        return;
    }

    // Placeholder for classes info, you would get this dynamically from your form/database
    const classes = [
        {
            course: 'Mathematics',
            professor: 'Prof. A',
            day: 'Monday',
            time: '10:00',
            duration: 1 // hours
        },
        {
            course: 'Physics',
            professor: 'Prof. B',
            day: 'Tuesday',
            time: '11:00',
            duration: 2 // hours
        }
    ];

    const events = classes.map(cls => {
        const startTime = parseTime(cls.time);
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + cls.duration);

        return {
            title: `${cls.course} - ${cls.professor}`,
            start: [startTime.getFullYear(), startTime.getMonth() + 1, startTime.getDate(), startTime.getHours(), startTime.getMinutes()],
            end: [endTime.getFullYear(), endTime.getMonth() + 1, endTime.getDate(), endTime.getHours(), endTime.getMinutes()],
            description: `Course: ${cls.course}, Professor: ${cls.professor}`,
            location: 'University',
            status: 'CONFIRMED',
            busyStatus: 'BUSY'
        };
    });

    // Generate the .ical file
    ics.createEvents(events, (error, value) => {
        if (error) {
            console.log(error);
        }

        // Trigger file download
        const link = document.createElement('a');
        link.href = 'data:text/calendar;charset=utf8,' + encodeURIComponent(value);
        link.download = `timetable_year${year}_batch${batch}.ics`;
        link.click();
    });
}

// Utility function to parse the time (hh:mm) into a Date object
function parseTime(timeString) {
    const now = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    now.setHours(hours, minutes, 0, 0);
    return now;
}

// Export the function
module.exports = {
    generateICalFile
};
