const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");        
const fsp = require("fs/promises");
const csv = require("csv-parser"); // Assuming you're using a library for CSV parsing
const nodecallspython = require("node-calls-python");

let mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile("index.html");

  // Register a global shortcut (Ctrl+Shift+I or Cmd+Opt+I on macOS) to toggle DevTools
  globalShortcut.register("Ctrl+Shift+I", () => {
    mainWindow.webContents.toggleDevTools();
  });
});

ipcMain.handle('virtualize', async (event, { filePath, type }) => {
  return new Promise((resolve, reject) => {
    const pythonPath = 'python';
    const scriptPath = path.join(__dirname, 'virtualize.py');

    const process = spawn(pythonPath, [scriptPath, filePath, type]);

    process.stdout.on('data', (data) => {
      const message = data.toString();
      console.log('Script output:\n', message);
      event.sender.send('virtualize-log', message); // Send logs to the renderer
    });

    process.stderr.on('data', (err) => {
      const errorMsg = err.toString();
      console.error('Error:', errorMsg);
      event.sender.send('virtualize-log', `Error: ${errorMsg}`); // Send errors to the renderer
    });

    process.on('close', async (code) => {
      if (code === 0) {
        try {
          resolve();
        } catch (err) {
          reject(`Failed to read or parse the file: ${err.message}`);
        }
      } else {
        reject(`Python script exited with code ${code}`);
      }
    });
  });
});

ipcMain.handle("run-query", async (event, { query, filePath, format, shouldRun }) => {
  return new Promise((resolve, reject) => {
    const pythonPath = "python";
    const scriptPath = path.join(__dirname, "run_query.py");

    const process = spawn(pythonPath, [scriptPath, query, filePath, format, shouldRun]);

    process.stdout.on("data", (data) => {
      console.log("Script output:\n", data.toString());
    });

    process.stderr.on("data", (err) => {
      console.error("Error:", err.toString());
    });

    process.on("close", async (code) => {
      if (code === 0) {
        try {
          const result = await fsp.readFile("result.json", { encoding: "utf8" });
          resolve(JSON.parse(result));
        } catch (err) {
          reject(`Failed to read or parse the file: ${err.message}`);
        }
      } else {
        reject(`Python script exited with code ${code}`);
      }
    });
  });
});

// Listen for the readCsv request from renderer
ipcMain.handle("read-csv", async (event, filePath) => {
  try {
    const rows = [];

    console.log(filePath);

    const fileStream = fs.createReadStream(filePath).pipe(csv());
    fileStream.on("data", (data) => rows.push(data));
    await new Promise((resolve, reject) => {
      fileStream.on("end", resolve);
      fileStream.on("error", reject);
    });
    return rows;
  } catch (err) {
    console.error("Error reading CSV:", err);
    throw new Error("Failed to read CSV");
  }
});

// Read Parquet files.
ipcMain.handle('read-parquet', async (event, filePath) => {
  try {
    console.log('Reading Parquet file:', filePath);

    const { asyncBufferFromFile, parquetReadObjects } = await import('hyparquet');

    // Load Parquet file and read objects
    console.log('Start reading the Parquet file with hyparquet..');
    const file = await asyncBufferFromFile(filePath);
    const rows = await parquetReadObjects({ file, rowStart: 0, rowEnd: 1000 });
    console.log('Finished reading the Parquet file with hyparquet!')

    return rows;
  } catch (err) {
    console.error('Error reading Parquet:', err);
    throw new Error('Failed to read Parquet');
  }
});