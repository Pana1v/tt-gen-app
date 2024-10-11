function hideAllForms() {
    const forms = document.querySelectorAll('div[id$="-form"]'); // Select all form divs
    forms.forEach(form => form.style.display = 'none'); // Hide each form
}

document.getElementById('preferred-start-time').addEventListener('change', function () {
    const startTimeSelect = document.getElementById('start-time-select');
    if (this.checked) {
        startTimeSelect.disabled = false; // Enable the dropdown
    } else {
        startTimeSelect.disabled = true; // Disable the dropdown and clear value
        startTimeSelect.value = "";
    }
});

// Function to fetch CSV data and parse it
async function fetchCSVData(filePath) {
    const response = await fetch(filePath);
    const text = await response.text();

    // Use the exposed function to parse CSV
    const result = await window.electron.parseCSV(text); 

    // Handle the result, e.g., log or process it
    console.log(result); // For debugging purposes
    return result.data; // Return the parsed data
}

document.getElementById('generate-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // Prevent form submission

    // Fetch values from the form inputs
    const avoid12to1 = document.getElementById('avoid-12-1').checked;
    const avoidConsecutiveClasses = document.getElementById('consecutive-classes').checked;
    const freeFriday = document.getElementById('free-friday').checked;
    const finishPriority = document.getElementById('finish-priority').value;
    const openElectives12to1 = document.getElementById('open-electives').checked;
    const tutorials5to6 = document.getElementById('tutorials-5-6').checked;
    const courseType = document.getElementById('course-type').value;

    // Create an object to store the form data
    const formData = {
        avoid12to1,
        avoidConsecutiveClasses,
        freeFriday,
        finishPriority,
        openElectives12to1,
        tutorials5to6,
        courseType
    };

    console.log('Timetable Generation Options:', formData);

    // Fetch the CSV data
    const csvData = await fetchCSVData('class-data.csv'); // Adjust the path accordingly

    // Generate timetable with the collected options and CSV data
    const timetable = generateTimetable(formData, csvData);
    
    // Display the generated timetable
    displayTimetable(timetable);
});
// Function to generate timetable

document.getElementById('fetch-database').addEventListener('click', async () => {
    console.log('Fetch Database button clicked');

    try {
        const database = await window.electron.fetchDatabase();
        const outputDiv = document.getElementById('database-output');
        outputDiv.innerHTML = ''; // Clear previous data

        if (database && database.length > 0) {
            // Display the database in a table
            const table = document.createElement('table');
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';
            table.style.marginTop = '20px';

            // Create table headers
            const headers = ['Course Name', 'Instructor Name', 'Type', 'Location', 'Venue', 'Start Time', 'Day', 'Students', 'Duration'];
            const headerRow = document.createElement('tr');
            
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                th.style.border = '2px solid black';
                th.style.padding = '8px';
                th.style.backgroundColor = '#f2f2f2';
                th.style.textAlign = 'left';
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);

            // Create rows for each entry in the database
            database.forEach(entry => {
                const row = document.createElement('tr');
                
                headers.forEach(header => {
                    const key = header.toLowerCase().replace(/ /g, ''); // Matching keys with object properties
                    const cell = document.createElement('td');
                    cell.textContent = entry[key];
                    cell.style.border = '1px solid black';
                    cell.style.padding = '8px';
                    row.appendChild(cell);
                });

                table.appendChild(row);
            });

            outputDiv.appendChild(table);
        } else {
            outputDiv.textContent = 'No database entries found.';
        }
    } catch (error) {
        console.error('Failed to fetch database:', error);
        document.getElementById('database-output').textContent = 'Error fetching database';
    }
});

// Function to fetch database
async function fetchDatabase() {
    return await window.electron.fetchDatabase();
}
// Function to read the class-data.csv file
async function readClassDataCSV() {
    try {
        const csvData = await fetchCSVData('class-data.csv');
        console.log('Class Data CSV:', csvData);
        return csvData;
    } catch (error) {
        console.error('Error reading class-data.csv:', error);
        return [];
    }
}
const batches = {
    firstYear: [],
    secondYear: [],
    thirdYear: [],
    fourthYear: [],
};

// Function to generate a timetable based on form data and CSV data
function generateTimetable(formData, csvData) {
    console.log('Form Data:', formData);
    console.log('Parsed CSV Data:', csvData);

    const timetableGrid = {};
    const timeSlots = new Set(); // Store unique time slots
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Initialize the timetable for each day
    days.forEach(day => {
        timetableGrid[day] = {};
    });

    const conflicts = []; // To store conflicting classes

    // Check for time conflicts
    function isTimeConflict(classA, classB) {
        const startA = new Date(`1970-01-01T${classA["Start Time"].trim()}`);
        const endA = new Date(startA.getTime() + (classA["Duration"] * 60 * 1000));
        const startB = new Date(`1970-01-01T${classB["Start Time"].trim()}`);
        const endB = new Date(startB.getTime() + (classB["Duration"] * 60 * 1000));

        return startA < endB && startB < endA; // Check for overlap
    }

    // Determine batch from course code
    function getBatchFromCourseCode(courseCode) {
        const match = courseCode.match(/^([A-Z]{2})(\d{3,4})$/);
        if (match) {
            const courseNumber = parseInt(match[2]);
            console.log('Course Number:', courseNumber);
            if (courseNumber < 200) return 'firstYear';
            if (courseNumber < 300) return 'secondYear';
            if (courseNumber < 400) return 'thirdYear';
            return 'fourthYear';
        }
        return null;
    }

    // Process CSV data
    csvData.forEach(entry => {
        console.log('Processing Entry:', entry);
        let includeClass = true;

        // Validate entry properties
        if (!entry["Course Name"] || !entry["Type"] || !entry["Start Time"] || !entry["Day"] || !entry["Venue"]) {
            console.warn(`Invalid entry detected and skipped: ${JSON.stringify(entry)}`);
            console.log('Entry details:', entry); // Print detailed entry information
            // return; // Skip invalid entries
        }

        // Print each and every field
        Object.keys(entry).forEach(key => {
            console.log(`${key}: ${entry[key]}`);
        });

        // Apply user preferences
        if (formData.avoid12to1 && entry["Start Time"].trim() === '12:00') {
            includeClass = false;
            console.log(`Excluded ${entry["Course Name"]} at ${entry["Start Time"]} due to avoid12to1 preference.`);
        }

        // Check for consecutive classes
        if (formData.avoidConsecutiveClasses) {
            const lastClass = timetableGrid[entry["Day"]]?.[entry["Venue"]]?.[entry["Start Time"]];
            if (lastClass && isTimeConflict(lastClass, entry)) {
                includeClass = false;
                console.log(`Excluded ${entry["Course Name"]} due to consecutive class preference.`);
                conflicts.push(entry); // Add to conflicts
            }
        }

        // Add valid entries to timetable
        if (includeClass) {
            const day = entry["Day"];
            const venue = entry["Venue"];
            const startTime = entry["Start Time"];
            const courseNumber = entry["Course Name"];

            // Add the time slot to the set of time slots
            timeSlots.add(startTime);

            // Initialize the venue for the day if not already done
            if (!timetableGrid[day]) {
                timetableGrid[day] = {};
            }
            if (!timetableGrid[day][venue]) {
                timetableGrid[day][venue] = {};
            }

            // Assign the course to the respective time and venue
            timetableGrid[day][venue][startTime] = courseNumber;
            console.log(`Added ${courseNumber} to ${day} at ${startTime} in ${venue}`);

            // Determine the batch for the course
            const batch = getBatchFromCourseCode(courseNumber);
            if (batch) {
                batches[batch].push(entry); // Add entry to the respective batch
                console.log(`Added ${courseNumber} to ${batch}`);
                console.log('Batches:', batches);
            } else {
                conflicts.push(entry); // Add conflicting entries to conflicts
            }
        }
    });  // End of CSV data processing

    // Download CSV for each batch
    const csvHeaders = 'Course Name,Instructor Name,Type,Location,Start Time,Day,Students,Duration';
    Object.keys(batches).forEach(batchName => {
        const batchData = batches[batchName];

        if (batchData.length > 0) {
            // Convert batch data to CSV string
            const csvRows = [csvHeaders];
            batchData.forEach(entry => {
                csvRows.push(
                    `${entry["Course Name"]},${entry["Instructor Name"]},${entry["Type"]},${entry["Location"]},${entry["Start Time"]},${entry["Day"]},${entry["Students"]},${entry["Duration"]}`
                );
                console.log(`Added ${entry["Course Name"]} to CSV for ${batchName} batch.`);
                console.log(`Instructor: ${entry["Instructor Name"]}, Type: ${entry["Type"]}, Location: ${entry["Location"]}, Start Time: ${entry["Start Time"]}, Day: ${entry["Day"]}, Students: ${entry["Students"]}, Duration: ${entry["Duration"]}`);
            });
            const csvString = csvRows.join('\n');
            downloadFile(csvString, `${batchName}_timetable.csv`, 'text/csv');
            console.log(`Downloaded ${batchName} timetable.`);
        }
    });

    // Display tables with a certain entry
    function displayTablesWithEntry(entryName) {
        Object.keys(batches).forEach(batchName => {
            const batchData = batches[batchName];
            const filteredData = batchData.filter(entry => entry["Course Name"] === entryName);

            if (filteredData.length > 0) {
                const table = document.createElement('table');
                table.style.borderCollapse = 'collapse';
                table.style.width = '100%';
                table.style.marginTop = '20px';

                // Create table headers
                const headers = ['Course Name', 'Type', 'Start Time', 'Day', 'Venue'];
                const headerRow = document.createElement('tr');
                headers.forEach(header => {
                    const th = document.createElement('th');
                    th.textContent = header;
                    th.style.border = '1px solid black';
                    th.style.padding = '8px';
                    th.style.backgroundColor = '#f2f2f2';
                    th.style.textAlign = 'left';
                    headerRow.appendChild(th);
                });
                table.appendChild(headerRow);

                // Create rows for each entry in the filtered data
                filteredData.forEach(entry => {
                    const row = document.createElement('tr');
                    headers.forEach(header => {
                        const cell = document.createElement('td');
                        cell.textContent = entry[header];
                        cell.style.border = '1px solid black';
                        cell.style.padding = '8px';
                        row.appendChild(cell);
                    });
                    table.appendChild(row);
                });

                document.body.appendChild(table);
            }
        });
    }

    // Return the timetable grid and conflicts
    // return { timetableGrid, conflicts };
}

// Function to download a file
function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', function () {
    // Button references
    const updateDatabaseButton = document.getElementById('update-database');
    const generateTimetableButton = document.getElementById('generate-timetable');
    const viewDatabaseButton = document.getElementById('view-database');

    // Event listener for "Update Database" button
    updateDatabaseButton.addEventListener('click', function () {
        console.log('Update Database button clicked');
        hideAllForms(); // Hide all forms first
        const updateDatabaseForm = document.getElementById('update-database-form');
        updateDatabaseForm.style.display = 'block'; // Show the selected form
    });

    // Event listener for "Generate Timetable" button
    generateTimetableButton.addEventListener('click', async () => {
        console.log('Generate Timetable button clicked');
        hideAllForms(); // Hide all forms first
        const generateTimetableForm = document.getElementById('generate-timetable-form');
        generateTimetableForm.style.display = 'block'; // Show the selected form
    });

    viewDatabaseButton.addEventListener('click', async () => {
        console.log('View Database button clicked');
        hideAllForms(); // Hide all forms first
        const viewDatabaseForm = document.getElementById('view-database-form');
        viewDatabaseForm.style.display = 'block'; // Show the selected form
    });
    
    document.getElementById('class-form').addEventListener('submit', async (event) => {
        event.preventDefault();
    
        // Retrieve form values
        const courseName = document.getElementById('course-name').value;
        const professor = document.getElementById('professor').value;
        const classType = document.getElementById('class-type').value;
        const venuePreference = document.getElementById('venue-preference').value;
        const startTime = document.getElementById('preferred-start-time').value;
        const preferredDay = document.getElementById('preferred-day').value;
        const studentCount = document.getElementById('student-count').value;
        const hours = document.getElementById('hours').value;
        const courseType = document.getElementById('course-type').value;
    
        const classData = {
            courseName,
            professor,
            classType,
            courseType,
            venuePreference,
            startTime,
            preferredDay,
            studentCount,
            hours
        };

    
        try {
            const response = await window.electron.addClassToDatabase(classData); // Send data to backend
            console.log('Class added:', response);
            document.getElementById('update-database-form').style.display = 'none'; // Hide the form after submission
        } catch (error) {
            console.error('Failed to add class:', error);
        }
    });
    
    // Populate venue dropdown from CSV
    window.addEventListener('DOMContentLoaded', async () => {
        const venueSelect = document.getElementById('venue-preference');
        const venues = await window.electron.getVenuesFromCSV();
        venues.forEach(venue => {
            const option = document.createElement('option');
            option.value = venue;
            option.textContent = venue;
            venueSelect.appendChild(option);
        });
    });
});