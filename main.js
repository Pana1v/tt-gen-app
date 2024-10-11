const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const Papa = require('papaparse');

// Create the main window
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Ensure this is set up correctly
            contextIsolation: true, // Recommended
            enableRemoteModule: false,
            nodeIntegration: true,
        }
    });

    win.loadFile('index.html');
}

// Handle fetching the database from CSV
ipcMain.handle('fetchDatabase', async () => {
    const filePath = path.join(__dirname, 'class-data.csv');
    const results = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
});

// Add class to the database (CSV)
ipcMain.handle('addClassToDatabase', async (event, classData) => {
    const filePath = path.join(__dirname, 'class-data.csv');
    
    const newEntry = `${classData.courseName},${classData.professor},${classData.classType},${classData.venuePreference},${classData.startTime},${classData.preferredDay},${classData.studentCount},${classData.hours}\n`;

    return new Promise((resolve, reject) => {
        fs.appendFile(filePath, newEntry, (error) => {
            if (error) {
                console.error('Failed to add class to CSV:', error);
                reject({ success: false, message: 'Failed to add class to CSV' });
            } else {
                console.log("Class added to CSV.");
                resolve({ success: true, message: 'Class added successfully' });
            }
        });
    });
});

// Populate venue dropdown from CSV
ipcMain.handle('getVenuesFromCSV', async () => {
    const venues = [];
    const csvFilePath = path.join(__dirname, 'venues.csv');
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => venues.push(row.venue))
            .on('end', () => resolve(venues))
            .on('error', (error) => reject(error));
    });
});

// Parse CSV data
ipcMain.handle('parseCSV', async (event, csvText) => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            complete: (results) => resolve(results),
            error: (error) => reject(error)
        });
    });
});

// Save CSV data
ipcMain.handle('saveCSV', async (event, filePath, csvData) => {
    return new Promise((resolve, reject) => {
        const csvText = Papa.unparse(csvData, { header: true });
        fs.writeFile(filePath, csvText, (error) => {
            if (error) reject(error);
            else resolve({ success: true });
        });
    });
});

app.whenReady().then(createWindow);