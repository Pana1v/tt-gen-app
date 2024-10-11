const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    addClassToDatabase: (classData) => ipcRenderer.invoke('addClassToDatabase', classData),
    generateTimetable: () => ipcRenderer.invoke('generateTimetable'),
    viewTimetable: () => ipcRenderer.invoke('viewTimetable'),
    getVenuesFromCSV: () => ipcRenderer.invoke('getVenuesFromCSV'),
    parseCSV: (csvText) => ipcRenderer.invoke('parseCSV', csvText),
    saveCSV: (filePath, csvData) => ipcRenderer.invoke('saveCSV', filePath, csvData)
});
